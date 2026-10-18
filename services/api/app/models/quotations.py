"""Authoritative bounded quotation contracts. Unknown terms remain null."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BeforeValidator, Field, StringConstraints, model_validator

from app.models.cases import (
    CaseId,
    CompositionPart,
    ContractModel,
    DecimalString,
    Percentage,
    PositiveDecimal,
    Text,
    iso_date,
)

LongText = Annotated[str, StringConstraints(strict=True, max_length=2000)]
SmallText = Annotated[str, StringConstraints(strict=True, max_length=500)]
RequestKey = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{8,100}$")]
Revision = Annotated[int, Field(strict=True, ge=0, le=1000000)]
Days = Annotated[int, Field(strict=True, ge=0, le=3650)]


class CommercialData(ContractModel):
    unit_price_amount: PositiveDecimal | None = None
    price_unit: Literal["metre", "kg"] | None = None
    currency: Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")] | None = None
    quoted_quantity: PositiveDecimal | None = None
    quantity_unit: Literal["metre", "kg"] | None = None
    moq: DecimalString | None = None
    moq_unit: Literal["metre", "kg"] | None = None
    incoterm_text: SmallText | None = None
    payment_terms: SmallText | None = None
    quote_valid_until: Annotated[date, BeforeValidator(iso_date)] | None = None
    cost_basis_id: Text | None = None
    included_charges: list[Text] = Field(default_factory=list, max_length=12)
    excluded_charges: list[Text] = Field(default_factory=list, max_length=12)
    # Adjustments and evidence acceptance require a subsequent domain-policy slice.
    cost_adjustments: list[Text] = Field(default_factory=list, max_length=0)
    cost_basis_reviewed: bool | None = None


class QuoteTextileData(ContractModel):
    construction: Text | None = None
    composition: list[CompositionPart] = Field(default_factory=list, max_length=10)
    gsm: PositiveDecimal | None = None
    usable_width_cm: PositiveDecimal | None = None
    total_width_cm: PositiveDecimal | None = None
    colour: SmallText | None = None
    finish: SmallText | None = None
    recycled_content_pct: Percentage | None = None

    @model_validator(mode="after")
    def unique_fibres(self):
        if len({part.fibre for part in self.composition}) != len(self.composition):
            raise ValueError("Composition fibres must be unique")
        return self


class TransportLeg(ContractModel):
    leg_id: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_-]{1,60}$")]
    origin_label: SmallText | None = None
    destination_label: SmallText | None = None
    transport_mode: Literal["road", "sea"] | None = None
    distance_km: PositiveDecimal | None = None
    distance_source_type: (
        Literal["quotation_pdf", "synthetic_demo", "user_entered_assumption"] | None
    ) = None
    distance_source_note: SmallText | None = None
    factor_id: None = None  # This slice cannot create or approve a reference factor.


class SupplyChainData(ContractModel):
    production_lead_time_days: Days | None = None
    shipping_lead_time_days: Days | None = None
    end_to_end_lead_time_days: Days | None = None
    lead_time_basis: (
        Literal["full_order_calendar_days_to_buyer", "production_only", "shipping_only", "unknown"]
        | None
    ) = None
    lead_time_basis_reviewed: bool | None = None
    actual_net_fabric_mass_kg: PositiveDecimal | None = None
    actual_gross_shipment_mass_kg: PositiveDecimal | None = None
    actual_mass_covers_order: bool | None = None
    packaging_mass_kg: DecimalString | None = None
    carbon_scope_id: Text | None = None
    route_complete: bool | None = None
    legs: list[TransportLeg] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def unique_legs(self):
        if len({leg.leg_id for leg in self.legs}) != len(self.legs):
            raise ValueError("Route leg IDs must be unique")
        return self


class QuoteData(ContractModel):
    supplier_name: SmallText | None = None
    commercial: CommercialData = Field(default_factory=CommercialData)
    textile_specification: QuoteTextileData = Field(default_factory=QuoteTextileData)
    supply_chain: SupplyChainData = Field(default_factory=SupplyChainData)
    evidence_claims: list[SmallText] = Field(default_factory=list, max_length=12)
    evidence_reviews: list[SmallText] = Field(default_factory=list, max_length=0)


class FieldProvenance(ContractModel):
    field_path: Annotated[str, StringConstraints(min_length=1, max_length=160)]
    source_type: Literal[
        "quotation_pdf",
        "user_correction",
        "user_entered_assumption",
        "synthetic_demo",
        "verified_reference",
    ] = "quotation_pdf"
    document_sha256: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")] | None = None
    page_number: Annotated[int, Field(strict=True, ge=1, le=10)] | None = None
    excerpt: LongText | None = None
    review_state: Literal["unreviewed", "confirmed", "needs_review"] = "unreviewed"
    note: SmallText | None = None


class ExtractionMetadata(ContractModel):
    model_version: Annotated[str, StringConstraints(max_length=120)] | None = None
    prompt_token_count: Annotated[int, Field(strict=True, ge=0, le=1000000)] | None = None
    candidates_token_count: Annotated[int, Field(strict=True, ge=0, le=1000000)] | None = None
    total_token_count: Annotated[int, Field(strict=True, ge=0, le=1000000)] | None = None
    thoughts_token_count: Annotated[int, Field(strict=True, ge=0, le=1000000)] | None = None


class ExtractionResult(ContractModel):
    draft_data: QuoteData
    field_provenance: list[FieldProvenance] = Field(default_factory=list, max_length=300)
    warnings: list[SmallText] = Field(default_factory=list, max_length=20)
    provider_metadata: ExtractionMetadata | None = None


class ReviewDecision(ContractModel):
    field_path: Annotated[str, StringConstraints(min_length=1, max_length=160)]
    reviewed: bool
    basis: Literal["extracted", "correction", "assumption"]
    note: SmallText | None = None


class ReviewIssue(ContractModel):
    field_path: str
    code: str
    message: str
    severity: Literal["blocking", "warning", "info"] = "blocking"
    blocks: list[Literal["technical", "cost", "delivery", "carbon", "evidence", "ranking"]]
    blocks_confirmation: bool = False


class SourceFile(ContractModel):
    name: str
    mime_type: Literal["application/pdf"] = "application/pdf"
    bytes: int
    pages: int
    sha256: str


class RunError(ContractModel):
    code: str
    message: str
    retryable: bool = False


class RunRead(ContractModel):
    id: CaseId
    quote_id: CaseId
    request_key: RequestKey
    status: Literal[
        "running",
        "succeeded",
        "awaiting_review",
        "failed",
        "cancelled",
        "timed_out",
        "interrupted",
    ]
    ai_mode: Literal["live"] = "live"
    expected_case_revision: Revision
    expected_draft_revision: Revision
    started_at: datetime
    completed_at: datetime | None = None
    error: RunError | None = None
    model_id: str | None = None
    prompt_version: str | None = None
    model_call_count: int = 0
    result_draft_revision: int | None = None
    result_case_revision: int | None = None


class Confirmation(ContractModel):
    revision_id: CaseId
    draft_revision: Revision
    confirmed_at: datetime
    is_current: bool


class QuoteRead(ContractModel):
    id: CaseId
    case_id: CaseId
    case_data_revision: Revision
    source_file: SourceFile
    source_kind: Literal["upload"] = "upload"
    is_synthetic: Literal[True] = True
    draft_revision: Revision
    status: Literal["uploaded", "extracting", "needs_review", "confirmed", "failed"]
    draft_data: QuoteData | None = None
    raw_extraction: ExtractionResult | None = None
    source_extraction_run_id: CaseId | None = None
    field_provenance: list[FieldProvenance] = Field(default_factory=list)
    review_decisions: list[ReviewDecision] = Field(default_factory=list)
    issues: list[ReviewIssue] = Field(default_factory=list)
    confirmation: Confirmation | None = None
    latest_run: RunRead | None = None
    created_at: datetime
    updated_at: datetime


class IntakeLimits(ContractModel):
    maximum_quotes_per_case: int
    remaining_quote_slots: int
    maximum_file_bytes: int
    maximum_pdf_pages: int


class IntakeCapabilities(ContractModel):
    upload_enabled: bool
    extraction_enabled: bool
    upload_reason: str | None = None
    extraction_reason: str | None = None


class DataHandling(ContractModel):
    processing_notice: str
    retention_notice: str


class QuoteList(ContractModel):
    case_id: CaseId
    case_data_revision: Revision
    items: list[QuoteRead]
    limits: IntakeLimits
    capabilities: IntakeCapabilities
    data_handling: DataHandling
    samples: list[str] = Field(default_factory=list, max_length=0)


class SaveDraft(ContractModel):
    expected_case_revision: Revision
    expected_draft_revision: Revision
    source_extraction_run_id: CaseId
    draft_data: QuoteData
    review_decisions: list[ReviewDecision] = Field(max_length=300)


class ConfirmQuote(ContractModel):
    expected_case_revision: Revision
    expected_draft_revision: Revision
    source_extraction_run_id: CaseId
    acknowledge_review: Literal[True]


class StartExtraction(ContractModel):
    intent: Literal["extract_quote"]
    quote_id: CaseId
    expected_case_revision: Revision
    expected_draft_revision: Revision


class MutationReceipt(ContractModel):
    request_key: RequestKey
    kind: Literal["upload", "save", "confirm"]
    state: Literal["receiving", "saving", "committed", "rejected", "interrupted"]
    case_data_revision: int | None = None
    draft_revision: int | None = None
    quote_id: str | None = None
    revision_id: str | None = None
    quote: QuoteRead | None = None
    error: RunError | None = None
    retryable: bool = False


class ConfirmedRevision(ContractModel):
    id: CaseId
    draft_revision: Revision
    confirmed_by_uid: str
    confirmed_at: datetime
    source_file_sha256: str
    source_extraction_run_id: CaseId
    validated_data: QuoteData
    field_provenance: list[FieldProvenance]
    corrections: list[ReviewDecision]
    issues: list[ReviewIssue]


class RunEvent(ContractModel):
    sequence: int
    event_type: Literal["run_started", "tool_started", "review_required", "run_failed"]
    agent_name: None = None
    tool_name: Literal["extract_quote_pdf"] = "extract_quote_pdf"
    message: str
    timestamp: datetime


class RunEvents(ContractModel):
    run_id: CaseId
    items: list[RunEvent]


class CloseOperation(ContractModel):
    kind: Literal["upload", "save", "confirm", "extract"]
    quote_id: CaseId | None = None


class OperationResolution(ContractModel):
    request_key: RequestKey
    kind: Literal["upload", "save", "confirm", "extract"]
    state: Literal["cancelled", "recorded"]
    quote_id: CaseId | None = None
    run_id: CaseId | None = None
    message: str
