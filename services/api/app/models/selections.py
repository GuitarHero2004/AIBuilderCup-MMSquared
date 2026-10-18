"""Immutable, limited-scope buyer notes; never procurement approval or a full evaluation."""

from datetime import datetime
from typing import Annotated, Literal, Self
from unicodedata import category

from pydantic import AfterValidator, Field, StringConstraints, model_validator

from app.models.cases import CaseId, ContractModel
from app.models.comparison import CaseComparison
from app.models.quotations import RequestKey, Revision

Fingerprint = Annotated[str, StringConstraints(strict=True, pattern=r"^[a-f0-9]{64}$")]


def checked_reason(value: str) -> str:
    if any((ord(char) < 32 and char not in "\n\t") or ord(char) == 127 for char in value):
        raise ValueError("Use plain text; only paragraph breaks and tabs are allowed controls")
    if not any(not char.isspace() and category(char) != "Cf" for char in value):
        raise ValueError("Provide a visible buyer reason")
    return value


SelectionReason = Annotated[
    str,
    StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=2000),
    AfterValidator(checked_reason),
]


class SelectionCreate(ContractModel):
    expected_case_revision: Annotated[int, Field(strict=True, ge=1, le=1000000)]
    expected_input_fingerprint: Fingerprint
    selected_quote_id: CaseId
    expected_confirmed_revision_id: CaseId
    selection_reason: SelectionReason
    acknowledge_limitations: Literal[True]

    @model_validator(mode="before")
    @classmethod
    def explicit_acknowledgment(cls, value):
        if isinstance(value, dict) and value.get("acknowledge_limitations") is not True:
            raise ValueError("Explicitly acknowledge the limited comparison scope")
        return value


class SelectionRecord(ContractModel):
    id: CaseId
    case_id: CaseId
    record_type: Literal["buyer_selection_note"] = "buyer_selection_note"
    selected_quote_id: CaseId
    selected_confirmed_revision_id: CaseId
    selected_by_uid: str
    selection_reason: SelectionReason
    created_at: datetime
    case_data_revision: Revision
    input_fingerprint: Fingerprint
    comparison_snapshot: CaseComparison
    limitations: list[str]

    @model_validator(mode="after")
    def consistent_snapshot(self) -> Self:
        snapshot = self.comparison_snapshot
        rows = [row for row in snapshot.rows if row.quote_id == self.selected_quote_id]
        if (
            snapshot.case_id != self.case_id
            or snapshot.case_data_revision != self.case_data_revision
            or snapshot.input_fingerprint != self.input_fingerprint
            or len({row.quote_id for row in snapshot.rows}) != len(snapshot.rows)
            or len(rows) != 1
            or rows[0].confirmation_revision_id != self.selected_confirmed_revision_id
            or rows[0].status != "meets_checked_requirements"
        ):
            raise ValueError("The saved buyer note must match its exact checked offer")
        return self


class SelectionContext(ContractModel):
    case_data_revision: Revision | None
    is_current: bool | None
    message: str


class SelectionRead(ContractModel):
    selection: SelectionRecord
    current_context: SelectionContext


class SelectionSummary(ContractModel):
    id: CaseId
    case_id: CaseId
    selected_quote_id: CaseId
    selected_confirmed_revision_id: CaseId
    selection_reason: SelectionReason
    created_at: datetime
    case_data_revision: Revision
    input_fingerprint: Fingerprint
    supplier_name: str | None
    source_name: str


class SelectionList(ContractModel):
    case_id: CaseId
    items: list[SelectionSummary] = Field(max_length=10)
    maximum_selections: Literal[10] = 10
    remaining_selection_slots: Annotated[int, Field(ge=0, le=10)]


class SelectionOperation(ContractModel):
    request_key: RequestKey
    case_id: CaseId
    kind: Literal["selection_save"] = "selection_save"
    state: Literal["committed", "cancelled"]
    selection_id: CaseId | None

    @model_validator(mode="after")
    def consistent_receipt(self) -> Self:
        if (self.state == "committed") != (self.selection_id is not None):
            raise ValueError("A committed receipt requires the exact saved selection ID")
        return self
