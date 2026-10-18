"""Consistent, owner-scoped reads for confirmed quotation diagnostics."""

from datetime import UTC, datetime

from pydantic import ValidationError

from app.errors import ApiError
from app.models.cases import CaseRead, valid_case_id
from app.models.comparison import CaseComparison
from app.models.quotations import ConfirmedRevision, QuoteRead
from app.security import Principal
from app.services.comparison_engine import compare_confirmed_quote
from app.services.quotations import QuotationRepository, digest

LIMITATIONS = [
    "Checks use current human-confirmed quotation revisions and the saved case requirements.",
    "These are document-based checks, not fabric testing or supplier certification.",
    "Carbon estimates are unavailable until applicable emission factors are verified.",
    "No overall ranking, recommendation or purchasing decision is produced by this comparison.",
    "This read-only result is not a saved evaluation. "
    "Refresh after changing quotations or requirements.",
]


class _SnapshotMoved(Exception):
    """The discovered document set changed before its consistent read."""


def _invalid_state() -> ApiError:
    return ApiError(
        503,
        "COMPARISON_DATA_UNAVAILABLE",
        "Saved comparison inputs could not be verified. Reload the quotations and try again.",
    )


class ComparisonService:
    def __init__(self, repo: QuotationRepository, maximum_quotes: int = 4):
        self.repo = repo
        self.maximum_quotes = min(maximum_quotes, 4)

    def _ids(self, index: dict | None) -> list[str]:
        if index is None:
            return []
        ids = index.get("quote_ids") if isinstance(index, dict) else None
        if (
            not isinstance(ids, list)
            or len(ids) > self.maximum_quotes
            or any(not isinstance(value, str) or not valid_case_id(value) for value in ids)
            or len(set(ids)) != len(ids)
        ):
            raise _invalid_state()
        return sorted(ids)

    @staticmethod
    def _quote(raw: dict | None, case_id: str, quote_id: str, revision: int) -> QuoteRead:
        if not isinstance(raw, dict):
            raise _invalid_state()
        public = {key: value for key, value in raw.items() if key in QuoteRead.model_fields}
        public["case_data_revision"] = revision
        quote = QuoteRead.model_validate(public)
        if quote.id != quote_id or quote.case_id != case_id:
            raise _invalid_state()
        return quote

    @staticmethod
    def _current_revision(raw: dict, quote: QuoteRead) -> str | None:
        confirmation = quote.confirmation
        if quote.status != "confirmed" or confirmation is None or not confirmation.is_current:
            return None
        if (
            quote.draft_revision != confirmation.draft_revision
            or raw.get("confirmed_revision_id") != confirmation.revision_id
        ):
            raise _invalid_state()
        return confirmation.revision_id

    @staticmethod
    def _confirmed(
        raw: dict | None, quote: QuoteRead, revision_id: str, principal: Principal
    ) -> ConfirmedRevision:
        if not isinstance(raw, dict):
            raise _invalid_state()
        confirmed = ConfirmedRevision.model_validate(raw)
        if (
            confirmed.id != revision_id
            or confirmed.confirmed_by_uid != principal.uid
            or confirmed.draft_revision != quote.draft_revision
            or confirmed.source_file_sha256 != quote.source_file.sha256
            or confirmed.source_extraction_run_id != quote.source_extraction_run_id
            or quote.confirmation is None
            or confirmed.confirmed_at != quote.confirmation.confirmed_at
            or confirmed.validated_data != quote.draft_data
            or any(issue.blocks_confirmation for issue in confirmed.issues)
        ):
            raise _invalid_state()
        return confirmed

    def get(
        self, principal: Principal, case_id: str, expected_case_revision: int | None = None
    ) -> CaseComparison:
        if not valid_case_id(case_id):
            raise ApiError(404, "CASE_NOT_FOUND", "This case is not available in your session.")
        try:
            # Discover bounded document paths; only the final transaction supplies result data.
            for _attempt in range(3):
                initial = self.repo.read(principal.uid, case_id, {"index": "intake_state/index"})
                ids = self._ids(initial["index"])
                paths = {"index": "intake_state/index"}
                paths.update({f"quote_{qid}": f"quotes/{qid}" for qid in ids})
                discovery = self.repo.read(principal.uid, case_id, paths)
                if ids != self._ids(discovery["index"]):
                    continue
                discovered_case = CaseRead.model_validate(discovery["case"])
                if discovered_case.id != case_id:
                    raise _invalid_state()
                refs = {}
                for qid in ids:
                    raw = discovery[f"quote_{qid}"]
                    quote = self._quote(raw, case_id, qid, discovered_case.data_revision)
                    refs[qid] = self._current_revision(raw, quote)
                    if refs[qid] is not None:
                        paths[f"revision_{qid}"] = f"quotes/{qid}/revisions/{refs[qid]}"

                def read_snapshot(docs, ids=ids, refs=refs):
                    if self._ids(docs["index"]) != ids:
                        raise _SnapshotMoved()
                    case = CaseRead.model_validate(docs["case"])
                    if case.id != case_id:
                        raise _invalid_state()
                    if (
                        expected_case_revision is not None
                        and case.data_revision != expected_case_revision
                    ):
                        raise ApiError(
                            409,
                            "STALE_CASE_REVISION",
                            "The case changed. Refresh the comparison to check the latest inputs.",
                        )
                    rows = []
                    frozen_inputs = []
                    for qid in ids:
                        raw = docs[f"quote_{qid}"]
                        quote = self._quote(raw, case_id, qid, case.data_revision)
                        revision_id = self._current_revision(raw, quote)
                        if revision_id != refs[qid]:
                            raise _SnapshotMoved()
                        confirmed = (
                            self._confirmed(docs[f"revision_{qid}"], quote, revision_id, principal)
                            if revision_id is not None
                            else None
                        )
                        rows.append(compare_confirmed_quote(case.requirement, quote, confirmed))
                        frozen_inputs.append(
                            {
                                "quote": {
                                    "id": quote.id,
                                    "draft_revision": quote.draft_revision,
                                    "status": quote.status,
                                    "source_sha256": quote.source_file.sha256,
                                    "confirmation": quote.confirmation.model_dump(mode="json")
                                    if quote.confirmation
                                    else None,
                                },
                                "confirmed_revision": confirmed.model_dump(mode="json")
                                if confirmed
                                else None,
                            }
                        )
                    fingerprint = digest(
                        {
                            "scope": "confirmed_quote_checks_v1",
                            "case_id": case.id,
                            "case_data_revision": case.data_revision,
                            "requirement": case.requirement.model_dump(mode="json"),
                            "policy": case.default_policy.model_dump(mode="json"),
                            "inputs": frozen_inputs,
                        }
                    )
                    return CaseComparison(
                        case_id=case.id,
                        case_data_revision=case.data_revision,
                        checked_at=datetime.now(UTC),
                        input_fingerprint=fingerprint,
                        requirement=case.requirement,
                        rows=rows,
                        limitations=LIMITATIONS,
                    ), {}

                try:
                    return self.repo.atomic(principal.uid, case_id, paths, read_snapshot)
                except _SnapshotMoved:
                    continue
        except (ValidationError, KeyError, TypeError) as error:
            raise _invalid_state() from error
        raise ApiError(
            409,
            "COMPARISON_INPUT_CHANGED",
            "Quotations changed while being checked. "
            "Refresh to compare the latest saved revisions.",
            retryable=True,
        )
