"""Bounded saved-state assistant contracts; no model-supplied approval authority."""

from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import AfterValidator, Field, StringConstraints, model_validator

from app.models.cases import CaseId, ContractModel
from app.models.quotations import RequestKey, RunError

Intent = Literal["quote_help", "explain_comparison", "explain_selection"]
Screen = Literal["workspace", "case", "intake", "review", "comparison", "selection"]
AgentName = Literal["coordinator", "quotation_specialist", "sourcing_specialist"]
Fingerprint = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]


def safe_text(value: str) -> str:
    if not value.strip() or any(ord(c) < 32 and c not in "\n\t" or ord(c) == 127 for c in value):
        raise ValueError("Use visible text without control characters")
    return value.strip()


Message = Annotated[str, StringConstraints(strict=True, max_length=2000), AfterValidator(safe_text)]


class AssistantRequest(ContractModel):
    intent: Intent
    message: Message
    screen: Screen
    expected_case_revision: Annotated[int, Field(strict=True, ge=1, le=1000000)]
    quote_id: CaseId | None = None
    expected_draft_revision: Annotated[int, Field(strict=True, ge=0, le=1000000)] | None = None
    selection_id: CaseId | None = None
    expected_input_fingerprint: Fingerprint | None = None
    has_unsaved_changes: bool = False
    previous_run_id: CaseId | None = None

    @model_validator(mode="after")
    def scope(self) -> Self:
        if self.intent == "quote_help":
            if self.quote_id is None or self.expected_draft_revision is None or self.selection_id:
                raise ValueError("Quotation help requires one saved quotation and draft revision")
        elif self.quote_id is not None or self.expected_draft_revision is not None:
            raise ValueError("Quotation references belong only to quotation help")
        if (self.intent == "explain_selection") != (self.selection_id is not None):
            raise ValueError("A saved selection reference belongs only to selection explanation")
        return self


class AssistantFact(ContractModel):
    id: Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,79}$")]
    label: str = Field(max_length=250)
    value: str = Field(max_length=2000)
    quote_id: CaseId | None = None


class AssistantAction(ContractModel):
    kind: Literal["open_review", "open_comparison", "open_selection", "open_intake"]
    label: str = Field(max_length=160)
    case_id: CaseId
    quote_id: CaseId | None = None
    selection_id: CaseId | None = None
    field_path: str | None = Field(default=None, max_length=180)
    expected_case_revision: Annotated[int, Field(strict=True, ge=1, le=1000000)]


class AssistantNarrative(ContractModel):
    """Private provider output. Facts, navigation and clarification text are server-owned."""

    referenced_fact_ids: list[str] = Field(min_length=1, max_length=24)
    focus: Literal["review_gaps", "checked_tradeoff", "saved_selection", "limitations"]
    clarification_field_paths: list[str] = Field(default_factory=list, max_length=12)


class AssistantResult(ContractModel):
    summary: str = Field(max_length=3000)
    clarification_draft: str | None = Field(default=None, max_length=6000)
    facts: list[AssistantFact] = Field(max_length=60)
    referenced_fact_ids: list[str] = Field(max_length=24)
    actions: list[AssistantAction] = Field(max_length=6)


class AssistantRun(ContractModel):
    id: CaseId
    case_id: CaseId
    request_key: RequestKey
    intent: Intent
    screen: Screen
    message: Message
    status: Literal["running", "succeeded", "failed", "cancelled", "timed_out", "interrupted"]
    expected_case_revision: Annotated[int, Field(strict=True, ge=1, le=1000000)]
    expected_draft_revision: Annotated[int, Field(ge=0)] | None = None
    quote_id: CaseId | None = None
    selection_id: CaseId | None = None
    source_fingerprint: Fingerprint
    has_unsaved_changes: bool = False
    is_current: bool | None = None
    started_at: datetime
    completed_at: datetime | None = None
    error: RunError | None = None
    model_id: str
    prompt_version: str
    model_call_count: int = Field(default=0, ge=0, le=6)
    tool_call_count: int = Field(default=0, ge=0, le=8)
    result: AssistantResult | None = None


class AssistantEvent(ContractModel):
    sequence: int = Field(ge=1, le=80)
    event_type: Literal[
        "run_started",
        "agent_started",
        "tool_started",
        "tool_completed",
        "run_completed",
        "run_failed",
    ]
    agent_name: AgentName | None = None
    tool_name: (
        Literal["quotation_specialist", "sourcing_specialist", "read_saved_context"] | None
    ) = None
    message: str = Field(max_length=240)
    timestamp: datetime


class AssistantEvents(ContractModel):
    run_id: CaseId
    items: list[AssistantEvent] = Field(max_length=80)


class AssistantRunList(ContractModel):
    case_id: CaseId
    items: list[AssistantRun] = Field(max_length=20)


class AssistantCancellation(ContractModel):
    request_key: RequestKey
    case_id: CaseId
    state: Literal["cancelled", "recorded"]
    run_id: CaseId | None = None
