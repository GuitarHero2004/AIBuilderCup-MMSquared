"""The implemented, synthetic-only case subset of the v2 schema."""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)


def clean_text(value: str) -> str:
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("Control characters are not allowed")
    return value


Text = Annotated[
    str,
    StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=160),
    AfterValidator(clean_text),
]
DecimalString = Annotated[
    str,
    StringConstraints(strict=True, pattern=r"^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$"),
]


def positive(value: str) -> str:
    if Decimal(value) <= 0:
        raise ValueError("Must be greater than zero")
    return value


def percentage(value: str) -> str:
    if Decimal(value) > 100:
        raise ValueError("Percentage cannot exceed 100")
    return value


PositiveDecimal = Annotated[DecimalString, AfterValidator(positive)]
Percentage = Annotated[DecimalString, AfterValidator(percentage)]
CaseId = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{32}$")]


def iso_date(value: object) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Use a YYYY-MM-DD date")
    return value


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Destination(ContractModel):
    label: Text
    country_code: Literal["VN"]


class CompositionPart(ContractModel):
    fibre: Annotated[str, StringConstraints(strict=True, pattern=r"^[a-z][a-z_]{0,39}$")]
    percentage: Percentage


class TextileSpecification(ContractModel):
    construction: Literal["woven"]
    composition: list[CompositionPart] = Field(min_length=1, max_length=10)
    composition_tolerance_pp: Percentage
    target_gsm: PositiveDecimal
    gsm_tolerance_pct: Percentage
    minimum_usable_width_cm: PositiveDecimal
    required_colour: Text | None
    required_finish: Text | None
    required_evidence: list[Text] = Field(max_length=0)

    @model_validator(mode="after")
    def valid_composition(self) -> Self:
        fibres = [part.fibre for part in self.composition]
        if len(set(fibres)) != len(fibres):
            raise ValueError("Composition fibres must be unique")
        if abs(sum(Decimal(part.percentage) for part in self.composition) - 100) > Decimal("0.1"):
            raise ValueError("Composition must total 100 within 0.1 percentage point")
        return self


class Requirement(ContractModel):
    quantity: PositiveDecimal
    quantity_unit: Literal["metre"]
    order_reference_date: Annotated[date, BeforeValidator(iso_date)]
    maximum_lead_time_days: Annotated[int, Field(strict=True, ge=1, le=3650)]
    maximum_budget_amount: PositiveDecimal
    currency: Literal["USD"]
    destination: Destination
    cost_basis_id: Text
    cost_basis_description: Text
    carbon_scope_id: Text
    carbon_accounting_boundary: Literal["wtw"]
    textile_specification: TextileSpecification


class CaseCreate(ContractModel):
    name: Text
    requirement: Requirement


class Weights(ContractModel):
    cost: Literal["0.45"] = "0.45"
    lead_time: Literal["0.25"] = "0.25"
    carbon: Literal["0.30"] = "0.30"


class DecisionPolicy(ContractModel):
    policy_version: Literal["textile_mvp_v2"] = "textile_mvp_v2"
    weights: Weights = Field(default_factory=Weights)
    enforce_budget: Literal[True] = True
    enforce_delivery: Literal[True] = True
    technical_gate_required: Literal[True] = True
    complete_comparable_metrics_required: Literal[True] = True


class CaseRead(ContractModel):
    id: CaseId
    name: Text
    requirement: Requirement
    default_policy: DecisionPolicy = Field(default_factory=DecisionPolicy)
    data_revision: Annotated[int, Field(strict=True, ge=1)] = 1
    status: Literal[
        "draft", "collecting_quotes", "reviewing_quotes", "ready", "decided", "archived"
    ] = "draft"
    schema_version: Literal["2.0"] = "2.0"
    is_synthetic_demo: Literal[True] = True
    created_at: datetime
    updated_at: datetime


class CaseList(ContractModel):
    items: list[CaseRead]


def valid_case_id(value: str) -> bool:
    return re.fullmatch(r"[a-f0-9]{32}", value) is not None
