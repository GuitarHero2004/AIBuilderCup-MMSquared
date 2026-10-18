"""Read-only checks of immutable human-confirmed quotation revisions."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from app.models.cases import CaseId, ContractModel, Requirement
from app.models.quotations import Revision

CheckStatus = Literal["pass", "fail", "needs_review", "not_applicable"]
RowStatus = Literal[
    "meets_checked_requirements", "does_not_meet_requirements", "needs_review", "unconfirmed"
]
CalculatedDecimal = Annotated[
    str,
    StringConstraints(pattern=r"^(0|[1-9][0-9]*)(\.[0-9]+)?$", max_length=128),
]


class ComparisonCheck(ContractModel):
    code: str
    status: CheckStatus
    message: str
    field_paths: list[str] = Field(default_factory=list)


class ComparisonMetrics(ContractModel):
    quoted_cost_amount: CalculatedDecimal | None = None
    comparable_cost_amount: CalculatedDecimal | None = None
    currency: str | None = None
    net_fabric_mass_kg: CalculatedDecimal | None = None
    net_mass_basis: Literal["actual", "estimated"] | None = None
    end_to_end_lead_time_days: int | None = None
    arrival_date: str | None = None


class ComparisonRow(ContractModel):
    quote_id: CaseId
    source_name: str
    supplier_name: str | None
    confirmation_revision_id: CaseId | None
    draft_revision: Revision
    status: RowStatus
    metrics: ComparisonMetrics = Field(default_factory=ComparisonMetrics)
    checks: list[ComparisonCheck]


class ComparisonTradeoff(ContractModel):
    kind: Literal["faster_costs_more"] = "faster_costs_more"
    cheaper_quote_id: CaseId
    faster_quote_id: CaseId
    currency: Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
    additional_cost_amount: CalculatedDecimal
    delivery_days_saved: Annotated[int, Field(strict=True, gt=0)]

    @model_validator(mode="after")
    def distinct_positive_tradeoff(self):
        if self.cheaper_quote_id == self.faster_quote_id:
            raise ValueError("A trade-off must compare two distinct quotations")
        if Decimal(self.additional_cost_amount) <= 0:
            raise ValueError("The faster quotation must have a positive additional cost")
        return self


class CaseComparison(ContractModel):
    case_id: CaseId
    case_data_revision: Revision
    checked_at: datetime
    input_fingerprint: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
    scope: Literal["confirmed_quote_checks_v1"] = "confirmed_quote_checks_v1"
    requirement: Requirement
    rows: list[ComparisonRow] = Field(max_length=4)
    tradeoff_summary: ComparisonTradeoff | None = None
    carbon_available: Literal[False] = False
    ranking_available: Literal[False] = False
    limitations: list[str]
