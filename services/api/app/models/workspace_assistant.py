"""Owner-scoped platform navigation; model outputs never grant write authority."""

from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.models.assistant import Fingerprint, Message
from app.models.cases import CaseId, ContractModel, Text
from app.models.quotations import RequestKey, RunError


class WorkspaceAssistantAction(ContractModel):
    id: Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_:]{0,100}$")]
    kind: Literal[
        "open_workspace",
        "open_help",
        "create_case",
        "open_case",
        "open_intake",
        "open_comparison",
        "open_history",
    ]
    label: str = Field(max_length=240)
    case_id: CaseId | None = None
    expected_case_revision: int | None = Field(default=None, ge=1, le=1000000)


class WorkspaceAssistantCase(ContractModel):
    id: CaseId
    name: Text
    data_revision: int = Field(ge=1, le=1000000)
    quotation_count: int = Field(ge=0, le=4)
    confirmed_count: int = Field(ge=0, le=4)
    selection_count: int = Field(ge=0, le=20)


class WorkspaceAssistantSnapshot(ContractModel):
    workspace_fingerprint: Fingerprint
    cases: list[WorkspaceAssistantCase] = Field(max_length=2)
    actions: list[WorkspaceAssistantAction] = Field(max_length=11)


class WorkspaceNavigationRequest(ContractModel):
    message: Message
    expected_workspace_fingerprint: Fingerprint
    screen: Literal[
        "workspace", "help", "create", "case", "intake", "review", "comparison", "selection"
    ]


class WorkspaceNavigationResult(ContractModel):
    request_key: RequestKey
    status: Literal["running", "succeeded", "failed", "cancelled", "timed_out", "interrupted"]
    workspace_fingerprint: Fingerprint
    summary: str | None = Field(default=None, max_length=3000)
    actions: list[WorkspaceAssistantAction] = Field(default_factory=list, max_length=4)
    model_call_count: int = Field(default=0, ge=0, le=3)
    is_current: bool | None = None
    error: RunError | None = None


class WorkspaceNavigationChoice(ContractModel):
    """Private provider contract: choose from authoritative IDs, never free-form routes."""

    action_ids: list[str] = Field(min_length=1, max_length=4)
    focus: Literal["navigation", "next_step", "guide", "limitations"]
