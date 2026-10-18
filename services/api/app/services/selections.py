"""Human-only, immutable buyer notes with atomic freshness and retry recovery."""

import re
from datetime import UTC, datetime
from uuid import uuid4

from pydantic import ValidationError

from app.errors import ApiError
from app.models.cases import valid_case_id
from app.models.selections import (
    SelectionContext,
    SelectionCreate,
    SelectionList,
    SelectionOperation,
    SelectionRead,
    SelectionRecord,
    SelectionSummary,
)
from app.security import Principal
from app.services.comparison import ComparisonService
from app.services.quotations import QuotationRepository, digest, key_path

MAXIMUM_SELECTIONS = 10
LIMITATIONS = [
    "This is a buyer selection note based on the stated requirement checks, not purchase approval.",
    "Carbon estimates, overall ranking and AI recommendations are unavailable in this scope.",
    "The saved note does not place an order, contact a supplier or confirm supplier certification.",
    "Later source edits do not change this saved note; review freshness before relying on it.",
]


class _ListMoved(Exception):
    pass


def _unavailable() -> ApiError:
    return ApiError(
        503,
        "SELECTION_DATA_UNAVAILABLE",
        "The saved buyer note could not be verified. Retry its exact saved reference.",
        retryable=True,
    )


class SelectionService:
    def __init__(self, repo: QuotationRepository, maximum_quotes: int = 4):
        self.repo = repo
        self.comparisons = ComparisonService(repo, maximum_quotes)

    @staticmethod
    def _case(case_id: str) -> None:
        if not valid_case_id(case_id):
            raise ApiError(404, "CASE_NOT_FOUND", "This case is not available in your session.")

    @staticmethod
    def _ids(index: dict | None) -> list[str]:
        if index is None:
            return []
        ids = index.get("selection_ids") if isinstance(index, dict) else None
        if (
            not isinstance(ids, list)
            or len(ids) > MAXIMUM_SELECTIONS
            or any(not isinstance(item, str) or not valid_case_id(item) for item in ids)
            or len(set(ids)) != len(ids)
        ):
            raise _unavailable()
        return ids

    @staticmethod
    def _operation_path(key: str) -> str:
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", key):
            raise ApiError(422, "INVALID_INPUT", "Use the original bounded save request key.")
        return f"selection_operations/{key_path(key)}"

    @staticmethod
    def _receipt(raw: dict, case_id: str, key: str) -> SelectionOperation:
        try:
            receipt = SelectionOperation.model_validate(raw["receipt"])
            if receipt.case_id != case_id or receipt.request_key != key:
                raise _unavailable()
            if receipt.state == "committed" and (
                not isinstance(raw.get("fingerprint"), str)
                or not re.fullmatch(r"[a-f0-9]{64}", raw["fingerprint"])
            ):
                raise _unavailable()
            return receipt
        except (ValidationError, KeyError, TypeError) as error:
            raise _unavailable() from error

    @classmethod
    def _replay(cls, raw: dict, case_id: str, key: str, fingerprint: str) -> SelectionOperation:
        receipt = cls._receipt(raw, case_id, key)
        if receipt.state == "cancelled":
            raise ApiError(
                409,
                "OPERATION_CANCELLED",
                "This unresolved attempt was closed. Review again and use a new request key.",
            )
        if raw["fingerprint"] != fingerprint:
            raise ApiError(
                409, "IDEMPOTENCY_CONFLICT", "This save key belongs to a different reviewed note."
            )
        return receipt

    def _existing_save(
        self, principal: Principal, case_id: str, key: str, fingerprint: str
    ) -> SelectionOperation | None:
        docs = self.repo.read(principal.uid, case_id, {"operation": self._operation_path(key)})
        raw = docs["operation"]
        return self._replay(raw, case_id, key, fingerprint) if raw is not None else None

    @staticmethod
    def _record(
        raw: dict | None, principal: Principal, case_id: str, selection_id: str
    ) -> SelectionRecord:
        if raw is None:
            raise ApiError(404, "SELECTION_NOT_FOUND", "This buyer note is not available.")
        try:
            record = SelectionRecord.model_validate(raw)
            if (
                record.id != selection_id
                or record.case_id != case_id
                or record.selected_by_uid != principal.uid
            ):
                raise _unavailable()
            return record
        except (ValidationError, KeyError, TypeError) as error:
            raise _unavailable() from error

    def save(
        self,
        principal: Principal,
        case_id: str,
        key: str,
        payload: SelectionCreate,
        *,
        actor: str,
    ) -> SelectionOperation:
        if actor != "human_route":
            raise ApiError(
                403, "HUMAN_REVIEW_REQUIRED", "Only the buyer review route can save this note."
            )
        self._case(case_id)
        fingerprint = digest(payload.model_dump(mode="json"))
        # A committed operation remains recoverable after source changes or malformed inputs.
        existing = self._existing_save(principal, case_id, key, fingerprint)
        if existing is not None:
            return existing
        selection_id, stamp = uuid4().hex, datetime.now(UTC)
        paths = {
            "selection_operation": self._operation_path(key),
            "selection_record": f"selections/{selection_id}",
            "selection_index": "selection_state/index",
        }

        def before_snapshot(docs):
            raw = docs["selection_operation"]
            if raw is not None:
                return self._replay(raw, case_id, key, fingerprint), {}
            return None

        def accept(comparison, docs):
            if comparison.input_fingerprint != payload.expected_input_fingerprint:
                raise ApiError(
                    409, "STALE_COMPARISON", "The checked inputs changed. Refresh and review again."
                )
            selected = next(
                (row for row in comparison.rows if row.quote_id == payload.selected_quote_id), None
            )
            if (
                selected is None
                or selected.status != "meets_checked_requirements"
                or selected.confirmation_revision_id != payload.expected_confirmed_revision_id
            ):
                raise ApiError(
                    409,
                    "SELECTION_UNAVAILABLE",
                    "Choose a current confirmed offer that meets all displayed requirement checks.",
                )
            ids = self._ids(docs["selection_index"])
            if len(ids) >= MAXIMUM_SELECTIONS:
                raise ApiError(
                    429, "SELECTION_LIMIT_REACHED", "This demo case can keep ten buyer notes."
                )
            if docs["selection_record"] is not None:
                raise _unavailable()
            record = SelectionRecord(
                id=selection_id,
                case_id=case_id,
                selected_quote_id=selected.quote_id,
                selected_confirmed_revision_id=payload.expected_confirmed_revision_id,
                selected_by_uid=principal.uid,
                selection_reason=payload.selection_reason,
                created_at=stamp,
                case_data_revision=comparison.case_data_revision,
                input_fingerprint=comparison.input_fingerprint,
                comparison_snapshot=comparison,
                limitations=LIMITATIONS,
            )
            receipt = SelectionOperation(
                request_key=key, case_id=case_id, state="committed", selection_id=selection_id
            )
            stored = record.model_dump(mode="json")
            stored["created_at"] = stamp
            return receipt, {
                "selection_record": stored,
                "selection_operation": {
                    "fingerprint": fingerprint,
                    "receipt": receipt.model_dump(mode="json"),
                    "created_at": stamp,
                },
                "selection_index": {"selection_ids": [*ids, selection_id]},
            }

        try:
            return self.comparisons.run(
                principal,
                case_id,
                payload.expected_case_revision,
                extra_paths=paths,
                before_snapshot=before_snapshot,
                accept=accept,
            )
        except ApiError:
            # A concurrent identical commit may finish while path discovery sees stale data.
            # Resolve its receipt before interpreting this request as rejected or unknown.
            existing = self._existing_save(principal, case_id, key, fingerprint)
            if existing is not None:
                return existing
            raise

    def operation(self, principal: Principal, case_id: str, key: str) -> SelectionOperation:
        self._case(case_id)
        docs = self.repo.read(principal.uid, case_id, {"operation": self._operation_path(key)})
        if docs["operation"] is None:
            raise ApiError(404, "OPERATION_NOT_FOUND", "This save attempt has no recorded outcome.")
        return self._receipt(docs["operation"], case_id, key)

    def cancel(self, principal: Principal, case_id: str, key: str) -> SelectionOperation:
        self._case(case_id)
        stamp = datetime.now(UTC)

        def close(docs):
            if docs["operation"] is not None:
                return self._receipt(docs["operation"], case_id, key), {}
            receipt = SelectionOperation(
                request_key=key, case_id=case_id, state="cancelled", selection_id=None
            )
            return receipt, {
                "operation": {
                    "fingerprint": None,
                    "receipt": receipt.model_dump(mode="json"),
                    "created_at": stamp,
                }
            }

        return self.repo.atomic(
            principal.uid, case_id, {"operation": self._operation_path(key)}, close
        )

    def get(self, principal: Principal, case_id: str, selection_id: str) -> SelectionRead:
        self._case(case_id)
        if not valid_case_id(selection_id):
            raise ApiError(404, "SELECTION_NOT_FOUND", "This buyer note is not available.")
        docs = self.repo.read(principal.uid, case_id, {"selection": f"selections/{selection_id}"})
        record = self._record(docs["selection"], principal, case_id, selection_id)
        revision = docs["case"].get("data_revision")
        if type(revision) is not int or not 0 <= revision <= 1000000:
            revision = None
        try:
            current = self.comparisons.get(principal, case_id)
            is_current = current.input_fingerprint == record.input_fingerprint
            context = SelectionContext(
                case_data_revision=current.case_data_revision,
                is_current=is_current,
                message="The saved source snapshot still matches the current checked inputs."
                if is_current
                else "Inputs changed after this note was saved. The original note is unchanged.",
            )
        except ApiError:
            context = SelectionContext(
                case_data_revision=revision,
                is_current=None,
                message="The note is saved; current input freshness could not be verified.",
            )
        return SelectionRead(selection=record, current_context=context)

    @staticmethod
    def _summary(record: SelectionRecord) -> SelectionSummary:
        selected = next(
            row
            for row in record.comparison_snapshot.rows
            if row.quote_id == record.selected_quote_id
        )
        return SelectionSummary(
            id=record.id,
            case_id=record.case_id,
            selected_quote_id=record.selected_quote_id,
            selected_confirmed_revision_id=record.selected_confirmed_revision_id,
            selection_reason=record.selection_reason,
            created_at=record.created_at,
            case_data_revision=record.case_data_revision,
            input_fingerprint=record.input_fingerprint,
            supplier_name=selected.supplier_name,
            source_name=selected.source_name,
        )

    def list(self, principal: Principal, case_id: str) -> SelectionList:
        self._case(case_id)
        for _attempt in range(3):
            initial = self.repo.read(
                principal.uid, case_id, {"selection_index": "selection_state/index"}
            )
            ids = self._ids(initial["selection_index"])
            paths = {"selection_index": "selection_state/index"}
            paths.update({f"selection_{sid}": f"selections/{sid}" for sid in ids})

            def snapshot(docs, ids=ids):
                if self._ids(docs["selection_index"]) != ids:
                    raise _ListMoved()
                records = []
                for sid in reversed(ids):
                    if docs[f"selection_{sid}"] is None:
                        raise _unavailable()
                    record = self._record(docs[f"selection_{sid}"], principal, case_id, sid)
                    records.append(self._summary(record))
                return SelectionList(
                    case_id=case_id,
                    items=records,
                    remaining_selection_slots=MAXIMUM_SELECTIONS - len(ids),
                ), {}

            try:
                return self.repo.atomic(principal.uid, case_id, paths, snapshot)
            except _ListMoved:
                continue
        raise ApiError(
            409,
            "SELECTION_HISTORY_CHANGED",
            "Buyer notes changed. Refresh the saved list.",
            retryable=True,
        )
