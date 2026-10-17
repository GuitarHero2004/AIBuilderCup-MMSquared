"""Owner-scoped quotation lifecycle. Models draft; only explicit human APIs confirm."""

import asyncio
import hashlib
import json
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, Protocol
from uuid import uuid4

from app.config import Settings
from app.errors import ApiError
from app.models.cases import valid_case_id
from app.models.quotations import (
    CloseOperation,
    ConfirmedRevision,
    ConfirmQuote,
    DataHandling,
    ExtractionResult,
    FieldProvenance,
    IntakeCapabilities,
    IntakeLimits,
    MutationReceipt,
    OperationResolution,
    QuoteData,
    QuoteList,
    QuoteRead,
    ReviewDecision,
    ReviewIssue,
    RunEvent,
    RunEvents,
    RunRead,
    SaveDraft,
    StartExtraction,
)
from app.security import Principal


class QuotationRepository(Protocol):
    def read(self, uid: str, case_id: str, paths: dict[str, str]) -> dict: ...
    def atomic(self, uid: str, case_id: str, paths: dict[str, str], work: Callable) -> Any: ...


def now() -> datetime:
    return datetime.now(UTC)


def digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


def key_path(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def require_id(value: str, label: str = "Quotation") -> None:
    if not valid_case_id(value):
        raise ApiError(404, "QUOTE_NOT_FOUND", f"{label} is not available in this case.")


def require_quote(value: dict | None) -> dict:
    if value is None:
        raise ApiError(404, "QUOTE_NOT_FOUND", "This quotation is not available in your session.")
    return value


def check_revisions(
    case: dict, quote: dict | None, expected_case: int, expected_draft: int | None = None
) -> None:
    if case["data_revision"] != expected_case:
        raise ApiError(409, "STALE_CASE_REVISION", "The case changed. Refresh and review it again.")
    if quote is not None and quote["draft_revision"] != expected_draft:
        raise ApiError(409, "STALE_DRAFT_REVISION", "The draft changed. Reload before saving.")


def bump(case: dict, status: str, timestamp: datetime) -> dict:
    return {
        **case,
        "data_revision": case["data_revision"] + 1,
        "status": status,
        "updated_at": timestamp,
    }


def flatten(data: dict, prefix: str = "") -> dict[str, Any]:
    """Only paths from the typed model exist; composition is one atomic reviewed array."""
    values = {}
    for name, value in data.items():
        path = f"{prefix}.{name}" if prefix else name
        if isinstance(value, dict):
            values.update(flatten(value, path))
        elif (
            isinstance(value, list)
            and value
            and isinstance(value[0], dict)
            and name != "composition"
        ):
            for index, item in enumerate(value):
                values.update(flatten(item, f"{path}[{index}]"))
        else:
            values[path] = value
    return values


MANDATORY = {
    "supplier_name": ["cost"],
    "commercial.unit_price_amount": ["cost", "ranking"],
    "commercial.price_unit": ["cost", "ranking"],
    "commercial.currency": ["cost", "ranking"],
    "commercial.quoted_quantity": ["cost", "ranking"],
    "commercial.quantity_unit": ["cost", "ranking"],
    "commercial.moq": ["technical", "ranking"],
    "commercial.moq_unit": ["technical", "ranking"],
    "commercial.cost_basis_id": ["cost", "ranking"],
    "commercial.cost_basis_reviewed": ["cost", "ranking"],
    "textile_specification.construction": ["technical", "ranking"],
    "textile_specification.composition": ["technical", "ranking"],
    "textile_specification.gsm": ["technical", "carbon", "ranking"],
    "textile_specification.usable_width_cm": ["technical", "ranking"],
    "textile_specification.total_width_cm": ["carbon", "ranking"],
    "supply_chain.end_to_end_lead_time_days": ["delivery", "ranking"],
    "supply_chain.lead_time_basis": ["delivery", "ranking"],
    "supply_chain.lead_time_basis_reviewed": ["delivery", "ranking"],
    "supply_chain.carbon_scope_id": ["carbon", "ranking"],
    "supply_chain.route_complete": ["carbon", "ranking"],
    "supply_chain.legs": ["carbon", "ranking"],
}


def review_issues(
    data: QuoteData, decisions: list[ReviewDecision], provenance: list[FieldProvenance]
) -> list[ReviewIssue]:
    values = flatten(data.model_dump(mode="json"))
    choices = {item.field_path: item for item in decisions}
    sources = {item.field_path: item for item in provenance}
    issues = []
    for path, value in values.items():
        if path.endswith((".leg_id", ".factor_id")) or path in {
            "commercial.cost_adjustments",
            "evidence_reviews",
        }:
            continue
        missing = value is None or value == [] or value == ""
        required = path in MANDATORY or path.endswith((".transport_mode", ".distance_km"))
        if missing and not required:
            continue
        decision = choices.get(path)
        note = (decision.note or "").strip() if decision else ""
        source = sources.get(path)
        support = bool(source and source.document_sha256 and source.page_number and source.excerpt)
        checked = bool(decision and decision.reviewed)
        if missing:
            issues.append(
                ReviewIssue(
                    field_path=path,
                    code="MISSING_INFORMATION",
                    message="Acknowledge this missing value with a note. It remains unavailable.",
                    blocks=MANDATORY.get(path, ["carbon", "ranking"]),
                    blocks_confirmation=not (checked and note),
                )
            )
        elif not checked:
            issues.append(
                ReviewIssue(
                    field_path=path,
                    code="REVIEW_REQUIRED",
                    message="Check this saved value before confirming.",
                    blocks=[],
                    blocks_confirmation=True,
                )
            )
        elif decision.basis != "extracted" and not note:
            issues.append(
                ReviewIssue(
                    field_path=path,
                    code="REVIEW_NOTE_REQUIRED",
                    message="Explain the correction or assumption.",
                    blocks=[],
                    blocks_confirmation=True,
                )
            )
        elif decision.basis == "extracted" and not support:
            issues.append(
                ReviewIssue(
                    field_path=path,
                    code="SOURCE_SUPPORT_REQUIRED",
                    message="No page evidence is available. Record a labelled assumption.",
                    blocks=[],
                    blocks_confirmation=True,
                )
            )
    if data.textile_specification.composition:
        total = sum(Decimal(part.percentage) for part in data.textile_specification.composition)
        if abs(total - Decimal("100")) > Decimal("0.1"):
            issues.append(
                ReviewIssue(
                    field_path="textile_specification.composition",
                    code="INVALID_COMPOSITION_TOTAL",
                    message="Composition percentages must total 100 within 0.1 percentage point.",
                    blocks=["technical", "ranking"],
                    blocks_confirmation=True,
                )
            )
    # Data review cannot manufacture an approved factor or a complete carbon result.
    for index, _ in enumerate(data.supply_chain.legs):
        issues.append(
            ReviewIssue(
                field_path=f"supply_chain.legs[{index}].factor_id",
                code="REFERENCE_FACTOR_UNAVAILABLE",
                message="No approved transport factor is connected in this milestone.",
                blocks=["carbon", "ranking"],
            )
        )
    for path, value, message, blocks in (
        (
            "commercial.cost_basis_reviewed",
            data.commercial.cost_basis_reviewed,
            "The comparison cost basis has not been agreed.",
            ["cost", "ranking"],
        ),
        (
            "supply_chain.lead_time_basis_reviewed",
            data.supply_chain.lead_time_basis_reviewed,
            "The delivery-time basis has not been agreed.",
            ["delivery", "ranking"],
        ),
        (
            "supply_chain.route_complete",
            data.supply_chain.route_complete,
            "Route coverage remains incomplete or unconfirmed.",
            ["carbon", "ranking"],
        ),
    ):
        if value is not True:
            issues.append(
                ReviewIssue(
                    field_path=path, code="BASIS_UNRESOLVED", message=message, blocks=blocks
                )
            )
    return issues


class QuotationService:
    def __init__(
        self, repository: QuotationRepository, settings: Settings, documents=None, provider=None
    ):
        self.repo, self.settings = repository, settings
        self.documents, self.provider = documents, provider

    def _capabilities(self) -> IntakeCapabilities:
        upload = bool(
            self.documents
            and getattr(self.documents, "enabled", True)
            and (self.settings.app_env == "local" or self.settings.upload_retention_notice)
        )
        extraction = bool(
            self.provider and getattr(self.provider, "enabled", True) and self.settings.ai_enabled
        )
        return IntakeCapabilities(
            upload_enabled=upload,
            extraction_enabled=extraction,
            upload_reason=None
            if upload
            else "Private storage and a retention notice must be configured.",
            extraction_reason=None
            if extraction
            else "Live Google extraction is not configured yet.",
        )

    @staticmethod
    def _public(quote: dict, case: dict) -> QuoteRead:
        fields = {key: value for key, value in quote.items() if key in QuoteRead.model_fields}
        fields["case_data_revision"] = case["data_revision"]
        if fields.get("draft_data") is not None:
            fields["issues"] = review_issues(
                QuoteData.model_validate(fields["draft_data"]),
                [
                    ReviewDecision.model_validate(item)
                    for item in fields.get("review_decisions", [])
                ],
                [
                    FieldProvenance.model_validate(item)
                    for item in fields.get("field_provenance", [])
                ],
            )
        return QuoteRead.model_validate(fields)

    @staticmethod
    def _index(index: dict | None, timestamp: datetime) -> dict:
        index = index or {"quote_ids": [], "reservations": {}}
        # Expired staging leases never authorize a late commit. Objects remain tracked by receipt.
        return {
            "quote_ids": index["quote_ids"],
            "reservations": {
                key: value
                for key, value in index.get("reservations", {}).items()
                if value["expires_at"] > timestamp
            },
        }

    def list(self, principal: Principal, case_id: str) -> QuoteList:
        docs = self.repo.read(principal.uid, case_id, {"index": "intake_state/index"})
        index = self._index(docs["index"], now())
        ids = index["quote_ids"]
        if ids:
            docs = self.repo.read(
                principal.uid, case_id, {quote_id: f"quotes/{quote_id}" for quote_id in ids}
            )
        items = [self._public(require_quote(docs[quote_id]), docs["case"]) for quote_id in ids]
        # Reconcile abandoned extraction before presenting an active state.
        for quote in items:
            if quote.latest_run and quote.latest_run.status == "running":
                self.run(principal, case_id, quote.latest_run.id)
        if any(quote.latest_run and quote.latest_run.status == "running" for quote in items):
            docs = self.repo.read(
                principal.uid, case_id, {quote_id: f"quotes/{quote_id}" for quote_id in ids}
            )
            items = [self._public(require_quote(docs[quote_id]), docs["case"]) for quote_id in ids]
        items.sort(key=lambda q: (q.created_at, q.id))
        return QuoteList(
            case_id=case_id,
            case_data_revision=docs["case"]["data_revision"],
            items=items,
            limits=IntakeLimits(
                maximum_quotes_per_case=self.settings.maximum_quotes_per_case,
                remaining_quote_slots=max(
                    0, self.settings.maximum_quotes_per_case - len(ids) - len(index["reservations"])
                ),
                maximum_file_bytes=self.settings.maximum_pdf_bytes,
                maximum_pdf_pages=self.settings.maximum_pdf_pages,
            ),
            capabilities=self._capabilities(),
            data_handling=DataHandling(
                processing_notice="Use synthetic, non-confidential PDFs only. Original files and "
                "reviewed data are private to this anonymous session. Extraction sends the PDF "
                "to Google's model service. Losing this session can lose access.",
                retention_notice=self.settings.upload_retention_notice
                or (
                    "Local emulator data only; no public retention policy is configured."
                    if self.settings.app_env == "local"
                    else "Retention is not configured. Upload is unavailable."
                ),
            ),
        )

    def get(self, principal: Principal, case_id: str, quote_id: str) -> QuoteRead:
        require_id(quote_id)
        docs = self.repo.read(principal.uid, case_id, {"quote": f"quotes/{quote_id}"})
        quote = require_quote(docs["quote"])
        if quote.get("latest_run") and quote["latest_run"]["status"] == "running":
            self.run(principal, case_id, quote["latest_run"]["id"])
            docs = self.repo.read(principal.uid, case_id, {"quote": f"quotes/{quote_id}"})
        return self._public(require_quote(docs["quote"]), docs["case"])

    def _storage_quote(self, principal: Principal, case_id: str, quote_id: str) -> dict:
        require_id(quote_id)
        return require_quote(
            self.repo.read(principal.uid, case_id, {"quote": f"quotes/{quote_id}"})["quote"]
        )

    def document(self, principal: Principal, case_id: str, quote_id: str) -> tuple[bytes, str]:
        quote = self._storage_quote(principal, case_id, quote_id)
        if self.documents is None:
            raise ApiError(503, "STORAGE_UNAVAILABLE", "The original PDF is unavailable.")
        source = quote["_storage"]
        content = self.documents.download_pdf(source["object_path"], source["generation"])
        if hashlib.sha256(content).hexdigest() != quote["source_file"]["sha256"]:
            raise ApiError(
                409, "SOURCE_REFERENCE_CHANGED", "The saved PDF does not match its source."
            )
        return content, quote["source_file"]["name"]

    def upload(
        self,
        principal: Principal,
        case_id: str,
        key: str,
        expected_revision: int,
        content: bytes,
        file_name: str,
        media_type: str,
        is_synthetic: bool,
    ) -> MutationReceipt:
        from app.adapters.quotation_documents import validate_pdf

        # Ownership and capability checks precede parse/storage work.
        self.repo.read(principal.uid, case_id, {})
        if not self._capabilities().upload_enabled:
            raise ApiError(503, "UPLOAD_UNAVAILABLE", "Private upload is not configured yet.")
        if not is_synthetic:
            raise ApiError(
                422, "SYNTHETIC_INPUT_REQUIRED", "Use synthetic, non-confidential PDFs only."
            )
        if len(content) > self.settings.maximum_pdf_bytes:
            raise ApiError(413, "PDF_TOO_LARGE", "This PDF exceeds the configured upload size.")
        pdf = validate_pdf(content, file_name, media_type)
        if pdf.page_count > self.settings.maximum_pdf_pages:
            raise ApiError(422, "PDF_PAGE_LIMIT", "This PDF exceeds the configured page limit.")
        fingerprint = digest(
            {
                "sha256": pdf.sha256,
                "name": pdf.file_name,
                "expected_case_revision": expected_revision,
                "is_synthetic": True,
            }
        )
        quote_id, stamp = uuid4().hex, now()
        operation_path = f"quote_intakes/{key_path(key)}"
        paths = {"op": operation_path, "index": "intake_state/index"}

        def reserve(docs):
            if docs["op"]:
                op = docs["op"]
                if op.get("cancelled"):
                    raise ApiError(
                        409,
                        "OPERATION_CANCELLED",
                        "This unresolved attempt was closed. Use a new request key.",
                    )
                if op["fingerprint"] != fingerprint:
                    raise ApiError(
                        409, "IDEMPOTENCY_CONFLICT", "This upload key belongs to different input."
                    )
                if op["receipt"]["state"] == "committed":
                    return (False, op), {}
                if op["expires_at"] <= stamp:
                    raise ApiError(
                        409,
                        "INTAKE_INTERRUPTED",
                        "This upload ended without a saved quote. Start a new upload.",
                    )
                raise ApiError(
                    409, "INTAKE_IN_PROGRESS", "Check the recorded upload before trying again."
                )
            check_revisions(docs["case"], None, expected_revision)
            index = self._index(docs["index"], stamp)
            if (
                len(index["quote_ids"]) + len(index["reservations"])
                >= self.settings.maximum_quotes_per_case
            ):
                raise ApiError(
                    429, "QUOTE_LIMIT_REACHED", "This case can hold at most four quotations."
                )
            expires = stamp + timedelta(seconds=120)
            index["reservations"][key_path(key)] = {"quote_id": quote_id, "expires_at": expires}
            op = {
                "fingerprint": fingerprint,
                "expires_at": expires,
                "staged_source": {
                    "object_path": self.documents.pdf_object_path(principal.uid, case_id, quote_id),
                    "generation": None,
                },
                "receipt": MutationReceipt(
                    request_key=key, kind="upload", state="saving", quote_id=quote_id
                ).model_dump(mode="json"),
            }
            return (True, op), {"op": op, "index": index}

        fresh, operation = self.repo.atomic(principal.uid, case_id, paths, reserve)
        if not fresh:
            return MutationReceipt.model_validate(operation["receipt"])
        stored = None
        try:
            stored = self.documents.upload_pdf(principal.uid, case_id, quote_id, content)
            paths["quote"] = f"quotes/{quote_id}"

            def commit(docs):
                op = docs["op"]
                index = self._index(docs["index"], now())
                if key_path(key) not in index["reservations"]:
                    raise ApiError(
                        409, "INTAKE_INTERRUPTED", "The upload lease expired. Read its saved state."
                    )
                check_revisions(docs["case"], None, expected_revision)
                case = bump(docs["case"], "collecting_quotes", now())
                quote = QuoteRead(
                    id=quote_id,
                    case_id=case_id,
                    case_data_revision=case["data_revision"],
                    source_file={
                        "name": pdf.file_name,
                        "bytes": pdf.size_bytes,
                        "pages": pdf.page_count,
                        "sha256": pdf.sha256,
                    },
                    draft_revision=0,
                    status="uploaded",
                    created_at=stamp,
                    updated_at=now(),
                ).model_dump(mode="json")
                quote.update(
                    created_at=stamp,
                    updated_at=now(),
                    _storage={"object_path": stored.object_path, "generation": stored.generation},
                )
                receipt = MutationReceipt(
                    request_key=key,
                    kind="upload",
                    state="committed",
                    case_data_revision=case["data_revision"],
                    draft_revision=0,
                    quote_id=quote_id,
                    quote=self._public(quote, case),
                )
                op["receipt"] = receipt.model_dump(mode="json")
                op["storage"] = quote["_storage"]
                index["quote_ids"].append(quote_id)
                del index["reservations"][key_path(key)]
                return receipt, {"case": case, "quote": quote, "op": op, "index": index}

            return self.repo.atomic(principal.uid, case_id, paths, commit)
        except Exception as error:
            # A timeout can mean the commit succeeded. Readback owns the answer.
            self._upload_failed(principal, case_id, key, stored)
            raise error

    def _upload_failed(self, principal, case_id, key, stored):
        def fail(docs):
            op = docs["op"]
            if not op or op["receipt"]["state"] == "committed":
                return None, {}
            op["expires_at"] = now()
            op["receipt"].update(
                state="interrupted",
                retryable=False,
                error={
                    "code": "INTAKE_INTERRUPTED",
                    "message": "The upload did not finish. Refresh before adding another PDF.",
                    "retryable": False,
                },
            )
            if stored:
                op["orphaned_storage"] = {
                    "object_path": stored.object_path,
                    "generation": stored.generation,
                }
            index = self._index(docs["index"], now())
            index["reservations"].pop(key_path(key), None)
            return None, {"op": op, "index": index}

        try:
            self.repo.atomic(
                principal.uid,
                case_id,
                {"op": f"quote_intakes/{key_path(key)}", "index": "intake_state/index"},
                fail,
            )
        except Exception:
            pass  # A durable lease prevents late commit; the caller must read back.

    def intake_operation(self, principal: Principal, case_id: str, key: str) -> MutationReceipt:
        def read(docs):
            op = docs["op"]
            if not op:
                raise ApiError(
                    404, "INTAKE_NOT_FOUND", "No upload receipt is recorded for this key."
                )
            if op["receipt"]["state"] == "saving" and op["expires_at"] <= now():
                op["receipt"]["state"] = "interrupted"
                return MutationReceipt.model_validate(op["receipt"]), {"op": op}
            return MutationReceipt.model_validate(op["receipt"]), {}

        return self.repo.atomic(
            principal.uid, case_id, {"op": f"quote_intakes/{key_path(key)}"}, read
        )

    def _review_paths(self, quote_id: str, key: str) -> dict[str, str]:
        require_id(quote_id)
        return {
            "quote": f"quotes/{quote_id}",
            "op": f"quotes/{quote_id}/review_operations/{key_path(key)}",
        }

    @staticmethod
    def _review_ready(case: dict, quote: dict, payload) -> None:
        check_revisions(
            case, quote, payload.expected_case_revision, payload.expected_draft_revision
        )
        if quote["status"] == "extracting":
            raise ApiError(409, "ACTIVE_RUN_EXISTS", "Read the extraction result before editing.")
        if quote.get("draft_data") is None:
            raise ApiError(409, "DRAFT_UNAVAILABLE", "Extract the quotation before reviewing it.")
        if quote.get("source_extraction_run_id") != payload.source_extraction_run_id:
            raise ApiError(
                409, "SOURCE_REFERENCE_CHANGED", "Review the latest extraction before saving."
            )

    @staticmethod
    def _replay(op: dict | None, fingerprint: str) -> MutationReceipt | None:
        if not op:
            return None
        if op.get("cancelled"):
            raise ApiError(
                409,
                "OPERATION_CANCELLED",
                "This unresolved attempt was closed. Use a new request key.",
            )
        if op["fingerprint"] != fingerprint:
            raise ApiError(
                409, "IDEMPOTENCY_CONFLICT", "This operation key belongs to another request."
            )
        return MutationReceipt.model_validate(op["receipt"])

    def save(
        self, principal: Principal, case_id: str, quote_id: str, key: str, payload: SaveDraft
    ) -> MutationReceipt:
        fingerprint = digest({"kind": "save", **payload.model_dump(mode="json")})
        stamp = now()

        def commit(docs):
            quote = require_quote(docs["quote"])
            replay = self._replay(docs["op"], fingerprint)
            if replay:
                return replay, {}
            self._review_ready(docs["case"], quote, payload)
            values = flatten(payload.draft_data.model_dump(mode="json"))
            original = flatten(quote["raw_extraction"]["draft_data"])
            extracted_sources = {
                p["field_path"]: p for p in quote["raw_extraction"]["field_provenance"]
            }
            decisions = {decision.field_path: decision for decision in payload.review_decisions}
            if len(decisions) != len(payload.review_decisions) or any(
                p not in values for p in decisions
            ):
                raise ApiError(
                    422, "INVALID_REVIEW_INPUT", "Review decisions must name unique current fields."
                )
            provenance = []
            for path, value in values.items():
                decision = decisions.get(path)
                source = extracted_sources.get(path)
                changed = value != original.get(path)
                if decision and decision.basis == "extracted" and changed:
                    raise ApiError(
                        422,
                        "INVALID_REVIEW_INPUT",
                        "Changed fields need a correction or assumption basis.",
                    )
                if (
                    decision
                    and decision.basis == "correction"
                    and not (source and source.get("page_number") and source.get("excerpt"))
                ):
                    raise ApiError(
                        422,
                        "INVALID_REVIEW_INPUT",
                        "Unsupported corrections must be labelled assumptions.",
                    )
                if decision and decision.basis != "extracted":
                    provenance.append(
                        FieldProvenance(
                            field_path=path,
                            source_type="user_correction"
                            if decision.basis == "correction"
                            else "user_entered_assumption",
                            document_sha256=quote["source_file"]["sha256"]
                            if decision.basis == "correction"
                            else None,
                            # Original evidence stays in raw_extraction, not proof of a correction.
                            review_state="unreviewed" if value is not None else "needs_review",
                            note=decision.note,
                        ).model_dump(mode="json")
                    )
                elif source:
                    provenance.append({**source, "review_state": "unreviewed"})
            data = payload.draft_data.model_dump(mode="json")
            reviews = [d.model_dump(mode="json") for d in payload.review_decisions]
            # A genuine no-op is acknowledged without advancing revisions.
            changed = data != quote["draft_data"] or reviews != quote.get("review_decisions", [])
            case = docs["case"]
            if changed:
                case = bump(case, "reviewing_quotes", stamp)
                quote.update(
                    draft_data=data,
                    review_decisions=reviews,
                    field_provenance=provenance,
                    draft_revision=quote["draft_revision"] + 1,
                    status="needs_review",
                    updated_at=stamp,
                )
                if quote.get("confirmation"):
                    quote["confirmation"]["is_current"] = False
                quote["confirmed_revision_id"] = None
            receipt = MutationReceipt(
                request_key=key,
                kind="save",
                state="committed",
                quote_id=quote_id,
                case_data_revision=case["data_revision"],
                draft_revision=quote["draft_revision"],
                quote=self._public(quote, case),
            )
            writes = {
                "op": {"fingerprint": fingerprint, "receipt": receipt.model_dump(mode="json")}
            }
            if changed:
                writes.update(case=case, quote=quote)
            return receipt, writes

        return self.repo.atomic(principal.uid, case_id, self._review_paths(quote_id, key), commit)

    def confirm(
        self,
        principal: Principal,
        case_id: str,
        quote_id: str,
        key: str,
        payload: ConfirmQuote,
        *,
        actor: str,
    ) -> MutationReceipt:
        # Callers must supply the server's human-route context, never a JSON flag or agent argument.
        if actor != "human_route":
            raise ApiError(
                403, "HUMAN_REVIEW_REQUIRED", "Only the buyer review route can confirm a quotation."
            )
        fingerprint = digest({"kind": "confirm", **payload.model_dump(mode="json")})
        revision_id, stamp = uuid4().hex, now()
        paths = self._review_paths(quote_id, key)
        paths["revision"] = f"quotes/{quote_id}/revisions/{revision_id}"

        def commit(docs):
            quote = require_quote(docs["quote"])
            replay = self._replay(docs["op"], fingerprint)
            if replay:
                return replay, {}
            self._review_ready(docs["case"], quote, payload)
            if quote.get("confirmation") and quote["confirmation"]["is_current"]:
                raise ApiError(
                    409, "ALREADY_CONFIRMED", "This saved revision is already confirmed."
                )
            data = QuoteData.model_validate(quote["draft_data"])
            decisions = [ReviewDecision.model_validate(d) for d in quote["review_decisions"]]
            provenance = [FieldProvenance.model_validate(p) for p in quote["field_provenance"]]
            issues = review_issues(data, decisions, provenance)
            if any(issue.blocks_confirmation for issue in issues):
                raise ApiError(
                    422,
                    "REVIEW_DECISIONS_REQUIRED",
                    "Review required fields, corrections and acknowledged gaps before confirming.",
                )
            values = flatten(data.model_dump(mode="json"))
            for source in provenance:
                value = values.get(source.field_path)
                source.review_state = (
                    "needs_review" if value is None or value == [] else "confirmed"
                )
            revision = ConfirmedRevision(
                id=revision_id,
                draft_revision=quote["draft_revision"],
                confirmed_by_uid=principal.uid,
                confirmed_at=stamp,
                source_file_sha256=quote["source_file"]["sha256"],
                source_extraction_run_id=payload.source_extraction_run_id,
                validated_data=data,
                field_provenance=provenance,
                corrections=decisions,
                issues=issues,
            )
            case = bump(docs["case"], "reviewing_quotes", stamp)
            quote.update(
                status="confirmed",
                confirmed_revision_id=revision_id,
                updated_at=stamp,
                confirmation={
                    "revision_id": revision_id,
                    "draft_revision": quote["draft_revision"],
                    "confirmed_at": stamp,
                    "is_current": True,
                },
                field_provenance=[p.model_dump(mode="json") for p in provenance],
            )
            receipt = MutationReceipt(
                request_key=key,
                kind="confirm",
                state="committed",
                quote_id=quote_id,
                revision_id=revision_id,
                case_data_revision=case["data_revision"],
                draft_revision=quote["draft_revision"],
                quote=self._public(quote, case),
            )
            frozen = revision.model_dump(mode="json")
            frozen["confirmed_at"] = stamp
            return receipt, {
                "case": case,
                "quote": quote,
                "revision": frozen,
                "op": {"fingerprint": fingerprint, "receipt": receipt.model_dump(mode="json")},
            }

        return self.repo.atomic(principal.uid, case_id, paths, commit)

    def review_operation(
        self, principal: Principal, case_id: str, quote_id: str, key: str
    ) -> MutationReceipt:
        docs = self.repo.read(principal.uid, case_id, self._review_paths(quote_id, key))
        require_quote(docs["quote"])
        if not docs["op"]:
            raise ApiError(
                404, "REVIEW_OPERATION_NOT_FOUND", "No saved receipt is recorded for this key."
            )
        return MutationReceipt.model_validate(docs["op"]["receipt"])

    def revision(
        self, principal: Principal, case_id: str, quote_id: str, revision_id: str
    ) -> ConfirmedRevision:
        require_id(quote_id)
        require_id(revision_id)
        docs = self.repo.read(
            principal.uid,
            case_id,
            {
                "quote": f"quotes/{quote_id}",
                "revision": f"quotes/{quote_id}/revisions/{revision_id}",
            },
        )
        require_quote(docs["quote"])
        if not docs["revision"]:
            raise ApiError(404, "REVISION_NOT_FOUND", "This confirmed revision is unavailable.")
        return ConfirmedRevision.model_validate(docs["revision"])

    @staticmethod
    def _run_public(run: dict) -> RunRead:
        return RunRead.model_validate(
            {key: value for key, value in run.items() if key in RunRead.model_fields}
        )

    def _start_run(
        self, principal: Principal, case_id: str, key: str, payload: StartExtraction
    ) -> tuple[RunRead, bool]:
        stamp, run_id = now(), uuid4().hex
        period = stamp.strftime("%Y-%m-%d")
        fingerprint = digest(payload.model_dump(mode="json"))
        paths = {
            "quote": f"quotes/{payload.quote_id}",
            "run": f"runs/{run_id}",
            "key": f"run_operations/{key_path(key)}",
            "active": "@user/limits/active",
            "user_limit": f"@user/limits/{period}",
            "global_limit": f"@system/system_limits/{period}",
            "global_active": "@system/system_limits/active",
            "control": "@system/system_limits/control",
        }

        def start(docs):
            quote = require_quote(docs["quote"])
            if docs["key"]:
                if docs["key"].get("cancelled"):
                    raise ApiError(
                        409,
                        "OPERATION_CANCELLED",
                        "This unresolved attempt was closed. Use a new request key.",
                    )
                if docs["key"]["fingerprint"] != fingerprint:
                    raise ApiError(
                        409, "IDEMPOTENCY_CONFLICT", "This run key belongs to another request."
                    )
                return (docs["key"]["run_id"], False), {}
            if not self._capabilities().extraction_enabled:
                raise ApiError(503, "AI_DISABLED", "Live Google extraction is not configured yet.")
            check_revisions(
                docs["case"], quote, payload.expected_case_revision, payload.expected_draft_revision
            )
            if (docs["control"] or {}).get("ai_disabled", False):
                raise ApiError(503, "AI_DISABLED", "Extraction is temporarily paused.")
            if docs["active"] and docs["active"].get("expires_at", stamp) > stamp:
                raise ApiError(
                    409,
                    "ACTIVE_RUN_EXISTS",
                    "An extraction is already active in this session.",
                    run_id=docs["active"]["run_id"],
                )
            if quote["status"] == "extracting":
                raise ApiError(
                    409,
                    "ACTIVE_RUN_EXISTS",
                    "Refresh the recorded extraction before retrying.",
                    run_id=quote["latest_run"]["id"],
                )
            global_leases = (docs["global_active"] or {}).get("leases", {})
            if not isinstance(global_leases, dict):
                raise ApiError(503, "LIMIT_STATE_UNAVAILABLE", "Extraction limits need attention.")
            global_leases = {key: expiry for key, expiry in global_leases.items() if expiry > stamp}
            if len(global_leases) >= self.settings.maximum_active_extractions_global:
                raise ApiError(
                    429,
                    "RUN_CAPACITY_REACHED",
                    "Extraction is busy. Try again shortly.",
                    retryable=True,
                )
            user_used = (docs["user_limit"] or {}).get("generations_reserved", 0)
            global_used = (docs["global_limit"] or {}).get("generations_reserved", 0)
            if (
                type(user_used) is not int
                or type(global_used) is not int
                or user_used < 0
                or global_used < 0
            ):
                raise ApiError(503, "LIMIT_STATE_UNAVAILABLE", "Extraction limits need attention.")
            if (
                user_used >= self.settings.maximum_generations_per_user_day
                or global_used >= self.settings.maximum_generations_global_day
            ):
                raise ApiError(
                    429, "RUN_QUOTA_EXCEEDED", "The current daily extraction allowance is used."
                )
            run = RunRead(
                id=run_id,
                quote_id=payload.quote_id,
                request_key=key,
                status="running",
                expected_case_revision=payload.expected_case_revision,
                expected_draft_revision=payload.expected_draft_revision,
                started_at=stamp,
                model_id=self.settings.gemini_model,
                prompt_version=getattr(self.provider, "prompt_version", None),
            ).model_dump(mode="json")
            run.update(
                started_at=stamp,
                expires_at=stamp + timedelta(seconds=150),
                deadline_at=stamp + timedelta(seconds=120),
                fingerprint=fingerprint,
                source_sha256=quote["source_file"]["sha256"],
                previous_quote_status=quote["status"],
                events=[
                    RunEvent(
                        sequence=1,
                        event_type="run_started",
                        message="Extraction request recorded.",
                        timestamp=stamp,
                    ).model_dump(mode="json")
                ],
            )
            quote.update(
                status="extracting",
                latest_run=self._run_public(run).model_dump(mode="json"),
                updated_at=stamp,
            )
            global_leases[run_id] = run["expires_at"]
            return (run_id, True), {
                "run": run,
                "quote": quote,
                "key": {"fingerprint": fingerprint, "run_id": run_id},
                "active": {"run_id": run_id, "case_id": case_id, "expires_at": run["expires_at"]},
                "global_active": {"leases": global_leases},
                "user_limit": {"generations_reserved": user_used + 1},
                "global_limit": {
                    **(docs["global_limit"] or {}),
                    "generations_reserved": global_used + 1,
                },
            }

        result_id, fresh = self.repo.atomic(principal.uid, case_id, paths, start)
        return self.run(principal, case_id, result_id), fresh

    def _mark_call(self, principal: Principal, case_id: str, run_id: str) -> None:
        def mark(docs):
            run = docs["run"]
            if (
                run is None
                or run["status"] != "running"
                or run.get("deadline_at", run["expires_at"]) <= now()
            ):
                raise ApiError(409, "RUN_INTERRUPTED", "The extraction is no longer active.")
            if (docs["control"] or {}).get("ai_disabled", False):
                raise ApiError(503, "AI_DISABLED", "Extraction is temporarily paused.")
            run["model_call_count"] = 1
            run["events"].append(
                RunEvent(
                    sequence=2,
                    event_type="tool_started",
                    message="The PDF is being sent to Google's extraction model.",
                    timestamp=now(),
                ).model_dump(mode="json")
            )
            return None, {"run": run}

        self.repo.atomic(
            principal.uid,
            case_id,
            {"run": f"runs/{run_id}", "control": "@system/system_limits/control"},
            mark,
        )

    def _finish_run(
        self,
        principal: Principal,
        case_id: str,
        run_id: str,
        result: ExtractionResult | None,
        raw_ref=None,
        error: ApiError | None = None,
        status: str = "failed",
    ) -> RunRead:
        stored = self.repo.read(principal.uid, case_id, {"run": f"runs/{run_id}"})["run"]
        if not stored:
            raise ApiError(404, "RUN_NOT_FOUND", "This extraction is unavailable.")
        paths = {
            "run": f"runs/{run_id}",
            "quote": f"quotes/{stored['quote_id']}",
            "active": "@user/limits/active",
            "global_active": "@system/system_limits/active",
        }
        stamp = now()

        def finish(docs):
            run = docs["run"]
            quote = require_quote(docs["quote"])
            if run["status"] != "running":
                return self._run_public(run), {}
            failure = error
            terminal = status
            if result is not None:
                try:
                    check_revisions(
                        docs["case"],
                        quote,
                        run["expected_case_revision"],
                        run["expected_draft_revision"],
                    )
                    if (
                        run.get("deadline_at", run["expires_at"]) <= now()
                        or quote["source_file"]["sha256"] != run["source_sha256"]
                        or not quote.get("latest_run")
                        or quote["latest_run"]["id"] != run_id
                        or not docs["active"]
                        or docs["active"].get("run_id") != run_id
                    ):
                        raise ApiError(
                            409,
                            "SOURCE_REFERENCE_CHANGED",
                            "The source or extraction lease changed.",
                        )
                except ApiError as conflict:
                    failure = conflict
            case = docs["case"]
            if result is not None and failure is None:
                terminal = "awaiting_review"
                case = bump(case, "reviewing_quotes", stamp)
                quote.update(
                    raw_extraction=result.model_dump(mode="json"),
                    draft_data=result.draft_data.model_dump(mode="json"),
                    field_provenance=[p.model_dump(mode="json") for p in result.field_provenance],
                    review_decisions=[],
                    draft_revision=quote["draft_revision"] + 1,
                    status="needs_review",
                    source_extraction_run_id=run_id,
                    confirmed_revision_id=None,
                    updated_at=stamp,
                )
                if quote.get("confirmation"):
                    quote["confirmation"]["is_current"] = False
                run.update(
                    result_draft_revision=quote["draft_revision"],
                    result_case_revision=case["data_revision"],
                )
            else:
                quote["status"] = (
                    run["previous_quote_status"] if quote.get("draft_data") else "failed"
                )
                quote["updated_at"] = stamp
            run.update(status=terminal, completed_at=stamp)
            if raw_ref:
                run["raw_output"] = {
                    "object_path": raw_ref.object_path,
                    "generation": raw_ref.generation,
                }
            if failure:
                run["error"] = {
                    "code": failure.code,
                    "message": failure.message,
                    "retryable": failure.retryable,
                }
            run["events"].append(
                RunEvent(
                    sequence=len(run["events"]) + 1,
                    event_type="review_required" if terminal == "awaiting_review" else "run_failed",
                    message="Extracted terms are saved for human review."
                    if terminal == "awaiting_review"
                    else "Extraction stopped. Read the recorded result before retrying.",
                    timestamp=stamp,
                ).model_dump(mode="json")
            )
            quote["latest_run"] = self._run_public(run).model_dump(mode="json")
            global_leases = (docs["global_active"] or {}).get("leases", {})
            global_leases.pop(run_id, None)
            writes = {"run": run, "quote": quote, "global_active": {"leases": global_leases}}
            if case["data_revision"] != docs["case"]["data_revision"]:
                writes["case"] = case
            if docs["active"] and docs["active"].get("run_id") == run_id:
                writes["active"] = {**docs["active"], "expires_at": stamp}
            return self._run_public(run), writes

        return self.repo.atomic(principal.uid, case_id, paths, finish)

    @staticmethod
    def _validated_extraction(result: ExtractionResult, quote: dict) -> ExtractionResult:
        result = ExtractionResult.model_validate(result)
        if len(result.model_dump_json().encode()) > 300_000:
            raise ApiError(
                502, "INVALID_EXTRACTION", "The model response exceeded the safe result limit."
            )
        values = flatten(result.draft_data.model_dump(mode="json"))
        seen = set()
        for source in result.field_provenance:
            if source.field_path in seen or source.field_path not in values:
                raise ApiError(
                    502, "INVALID_EXTRACTION", "The model returned an invalid source field."
                )
            seen.add(source.field_path)
            if (
                source.source_type != "quotation_pdf"
                or source.review_state == "confirmed"
                or source.document_sha256 != quote["source_file"]["sha256"]
                or (
                    source.page_number is not None
                    and source.page_number > quote["source_file"]["pages"]
                )
            ):
                raise ApiError(
                    502, "INVALID_EXTRACTION", "The model returned invalid source evidence."
                )
        if (
            result.draft_data.commercial.cost_basis_reviewed is not None
            or result.draft_data.supply_chain.lead_time_basis_reviewed is not None
        ):
            raise ApiError(
                502, "INVALID_EXTRACTION", "Model output cannot make human review decisions."
            )
        return result

    async def extract(
        self,
        principal: Principal,
        case_id: str,
        key: str,
        payload: StartExtraction,
        disconnected: Callable[[], Awaitable[bool]] | None = None,
    ) -> RunRead:
        # The provider never runs in a Firestore transaction or an untracked background task.
        run, fresh = await asyncio.to_thread(self._start_run, principal, case_id, key, payload)
        if not fresh:
            return run
        raw_ref = None
        work = None
        try:
            remaining_seconds = max(0, 120 - (now() - run.started_at).total_seconds())
            async with asyncio.timeout(remaining_seconds):
                quote = await asyncio.to_thread(
                    self._storage_quote, principal, case_id, payload.quote_id
                )
                content, _ = await asyncio.to_thread(
                    self.document, principal, case_id, payload.quote_id
                )
                if disconnected and await disconnected():
                    raise ApiError(
                        499, "CLIENT_DISCONNECTED", "The request ended before extraction completed."
                    )
                await asyncio.to_thread(self._mark_call, principal, case_id, run.id)
                work = asyncio.create_task(
                    self.provider.extract(
                        content, quote["source_file"]["sha256"], quote["source_file"]["pages"]
                    )
                )
                while not work.done():
                    await asyncio.wait({work}, timeout=0.2)
                    if disconnected and await disconnected():
                        work.cancel()
                        raise ApiError(
                            499,
                            "CLIENT_DISCONNECTED",
                            "The request ended before extraction completed.",
                        )
                result = self._validated_extraction(await work, quote)
                raw_ref = await asyncio.to_thread(
                    self.documents.put_extraction,
                    principal.uid,
                    case_id,
                    run.id,
                    result.model_dump_json().encode(),
                )
                return await asyncio.to_thread(
                    self._finish_run, principal, case_id, run.id, result, raw_ref
                )
        except (TimeoutError, asyncio.CancelledError) as error:
            if work:
                work.cancel()
            timed_out = isinstance(error, TimeoutError)
            failure = ApiError(
                504 if timed_out else 499,
                "RUN_TIMEOUT" if timed_out else "RUN_INTERRUPTED",
                "Extraction did not finish. An explicit retry may use additional allowance.",
                retryable=True,
                run_id=run.id,
            )
            terminal = "timed_out" if timed_out else "interrupted"
            # Shield this bounded final write from request cancellation; no model work survives it.
            try:
                await asyncio.shield(
                    asyncio.to_thread(
                        self._finish_run,
                        principal,
                        case_id,
                        run.id,
                        None,
                        raw_ref,
                        failure,
                        terminal,
                    )
                )
            except Exception:
                pass  # Expiry reconciliation is the durable crash recovery path.
            raise failure from error
        except Exception as error:
            if work and not work.done():
                work.cancel()
            failure = (
                error
                if isinstance(error, ApiError)
                else ApiError(
                    502,
                    "EXTRACTION_UNAVAILABLE",
                    "The model response could not be saved. Read the run before retrying.",
                    retryable=True,
                    run_id=run.id,
                )
            )
            failure.run_id = run.id
            terminal = "interrupted" if failure.code == "CLIENT_DISCONNECTED" else "failed"
            try:
                return await asyncio.to_thread(
                    self._finish_run, principal, case_id, run.id, None, raw_ref, failure, terminal
                )
            except Exception:
                raise failure from error

    def run(self, principal: Principal, case_id: str, run_id: str) -> RunRead:
        require_id(run_id, "Extraction")
        docs = self.repo.read(principal.uid, case_id, {"run": f"runs/{run_id}"})
        run = docs["run"]
        if not run:
            raise ApiError(
                404, "RUN_NOT_FOUND", "This extraction is not available in your session."
            )
        if run["status"] == "running" and run["expires_at"] <= now():
            return self._finish_run(
                principal,
                case_id,
                run_id,
                None,
                error=ApiError(
                    503,
                    "RUN_INTERRUPTED",
                    "The extraction lease expired before a result was saved.",
                    retryable=True,
                ),
                status="interrupted",
            )
        return self._run_public(run)

    def run_operation(self, principal: Principal, case_id: str, key: str) -> RunRead:
        docs = self.repo.read(principal.uid, case_id, {"key": f"run_operations/{key_path(key)}"})
        if not docs["key"]:
            raise ApiError(404, "RUN_NOT_FOUND", "No extraction is recorded for this key.")
        if docs["key"].get("cancelled"):
            raise ApiError(
                409, "OPERATION_CANCELLED", "This extraction attempt was closed before it started."
            )
        return self.run(principal, case_id, docs["key"]["run_id"])

    def run_events(self, principal: Principal, case_id: str, run_id: str) -> RunEvents:
        self.run(principal, case_id, run_id)
        run = self.repo.read(principal.uid, case_id, {"run": f"runs/{run_id}"})["run"]
        return RunEvents(run_id=run_id, items=run["events"])

    def close_operation(
        self, principal: Principal, case_id: str, key: str, payload: CloseOperation
    ) -> OperationResolution:
        """Fence only a missing request. Existing work must be recovered, never guessed away."""
        if payload.kind in {"save", "confirm"}:
            if payload.quote_id is None:
                raise ApiError(422, "QUOTE_REQUIRED", "The saved review requires its quotation ID.")
            paths = self._review_paths(payload.quote_id, key)
        elif payload.kind == "upload":
            paths = {"op": f"quote_intakes/{key_path(key)}"}
        else:
            paths = {"op": f"run_operations/{key_path(key)}"}
            if payload.quote_id is not None:
                paths["quote"] = f"quotes/{payload.quote_id}"

        def close(docs):
            if "quote" in docs:
                require_quote(docs["quote"])
            op = docs["op"]
            result = OperationResolution(
                request_key=key,
                kind=payload.kind,
                state="cancelled",
                quote_id=payload.quote_id,
                message="The unresolved attempt is closed. It cannot apply later.",
            )
            if op:
                if op.get("cancelled"):
                    return result, {}
                result.state = "recorded"
                result.message = "A request is recorded. Read its saved result before continuing."
                result.run_id = op.get("run_id")
                result.quote_id = op.get("receipt", {}).get("quote_id", payload.quote_id)
                return result, {}
            tombstone = {"cancelled": True, "created_at": now()}
            if payload.kind != "extract":
                tombstone["receipt"] = MutationReceipt(
                    request_key=key,
                    kind=payload.kind,
                    state="rejected",
                    quote_id=payload.quote_id,
                    error={
                        "code": "OPERATION_CANCELLED",
                        "message": result.message,
                        "retryable": False,
                    },
                ).model_dump(mode="json")
            return result, {"op": tombstone}

        return self.repo.atomic(principal.uid, case_id, paths, close)
