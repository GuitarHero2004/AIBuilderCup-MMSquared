"""Pure, deterministic checks of current immutable confirmed offer terms.

This module does not rank offers, calculate carbon, persist results or call AI.
Unknown information cannot satisfy a requirement. Decimal arithmetic stays local
so importing or running these checks cannot change another request's precision.
"""

import re
from datetime import timedelta
from decimal import Decimal, localcontext
from unicodedata import normalize

from app.models.cases import Requirement
from app.models.comparison import (
    CheckStatus,
    ComparisonCheck,
    ComparisonMetrics,
    ComparisonRow,
    ComparisonTradeoff,
)
from app.models.quotations import ConfirmedRevision, QuoteData, QuoteRead

ZERO = Decimal("0")
HUNDRED = Decimal("100")


def _text(value: str) -> str:
    # Formatting differences are harmless; synonyms and commercial meaning are not inferred.
    return " ".join(normalize("NFKC", value).casefold().split())


def _decimal_text(value: Decimal) -> str:
    result = format(value, "f")
    return result.rstrip("0").rstrip(".") if "." in result else result


def _current_confirmation(quote: QuoteRead, confirmed: ConfirmedRevision | None) -> bool:
    pointer = quote.confirmation
    return bool(
        confirmed is not None
        and pointer is not None
        and pointer.is_current
        and quote.status == "confirmed"
        and pointer.revision_id == confirmed.id
        and pointer.draft_revision == quote.draft_revision == confirmed.draft_revision
        and pointer.confirmed_at == confirmed.confirmed_at
        and quote.source_file.sha256 == confirmed.source_file_sha256
        and quote.source_extraction_run_id == confirmed.source_extraction_run_id
        and quote.draft_data == confirmed.validated_data
        and not any(issue.blocks_confirmation for issue in confirmed.issues)
    )


class _Checks:
    def __init__(self) -> None:
        self.items: list[ComparisonCheck] = []

    def add(self, code: str, status: CheckStatus, message: str, *paths: str) -> None:
        self.items.append(
            ComparisonCheck(code=code, status=status, message=message, field_paths=list(paths))
        )

    def text_match(self, code: str, required: str | None, actual: str | None, path: str) -> None:
        if required is None:
            self.add(code, "not_applicable", "No requirement is set for this term.", path)
        elif actual is None or not actual.strip():
            self.add(
                code, "needs_review", "The required term is missing from the confirmed offer.", path
            )
        elif _text(required) == _text(actual):
            self.add(code, "pass", "The confirmed term matches the requirement.", path)
        else:
            self.add(code, "fail", "The confirmed term does not match the requirement.", path)


def _technical(requirement: Requirement, data: QuoteData, checks: _Checks) -> None:
    required = requirement.textile_specification
    actual = data.textile_specification
    prefix = "draft_data.textile_specification."
    checks.text_match(
        "CONSTRUCTION", required.construction, actual.construction, prefix + "construction"
    )
    composition = {part.fibre: Decimal(part.percentage) for part in actual.composition}
    if not composition or abs(sum(composition.values(), ZERO) - HUNDRED) > Decimal("0.1"):
        checks.add(
            "COMPOSITION",
            "needs_review",
            "Confirm a complete fibre composition totaling 100%.",
            prefix + "composition",
        )
    else:
        target = {part.fibre: Decimal(part.percentage) for part in required.composition}
        tolerance = Decimal(required.composition_tolerance_pp)
        matches = all(
            abs(composition.get(fibre, ZERO) - target.get(fibre, ZERO)) <= tolerance
            for fibre in composition.keys() | target.keys()
        )
        checks.add(
            "COMPOSITION",
            "pass" if matches else "fail",
            "All fibre proportions are within the allowed tolerance."
            if matches
            else "At least one fibre proportion exceeds the allowed tolerance.",
            prefix + "composition",
        )
    if actual.gsm is None:
        checks.add("GSM", "needs_review", "Fabric GSM is missing.", prefix + "gsm")
    else:
        target_gsm = Decimal(required.target_gsm)
        tolerance_gsm = target_gsm * Decimal(required.gsm_tolerance_pct) / HUNDRED
        matches = target_gsm - tolerance_gsm <= Decimal(actual.gsm) <= target_gsm + tolerance_gsm
        checks.add(
            "GSM",
            "pass" if matches else "fail",
            "Fabric GSM is within the allowed range."
            if matches
            else "Fabric GSM is outside the allowed range.",
            prefix + "gsm",
        )
    if actual.usable_width_cm is None:
        checks.add(
            "USABLE_WIDTH",
            "needs_review",
            "Usable fabric width is missing.",
            prefix + "usable_width_cm",
        )
    else:
        matches = Decimal(actual.usable_width_cm) >= Decimal(required.minimum_usable_width_cm)
        checks.add(
            "USABLE_WIDTH",
            "pass" if matches else "fail",
            "Usable width meets the minimum." if matches else "Usable width is below the minimum.",
            prefix + "usable_width_cm",
        )
    checks.text_match("COLOUR", required.required_colour, actual.colour, prefix + "colour")
    checks.text_match("FINISH", required.required_finish, actual.finish, prefix + "finish")


def _net_mass(
    requirement: Requirement,
    data: QuoteData,
    metrics: ComparisonMetrics,
    checks: _Checks,
) -> Decimal | None:
    fabric = data.textile_specification
    supply = data.supply_chain
    commercial = data.commercial
    needed = "kg" in (commercial.price_unit, commercial.quantity_unit, commercial.moq_unit)
    total = Decimal(fabric.total_width_cm) if fabric.total_width_cm is not None else None
    usable = Decimal(fabric.usable_width_cm) if fabric.usable_width_cm is not None else None
    widths_consistent = total is not None and usable is not None and total >= usable
    widths_invalid = total is not None and usable is not None and total < usable
    width_paths = (
        "draft_data.textile_specification.total_width_cm",
        "draft_data.textile_specification.usable_width_cm",
    )
    if widths_invalid:
        checks.add(
            "WIDTH_CONSISTENCY",
            "needs_review",
            "Total width is below usable width; geometry cannot establish net mass.",
            *width_paths,
        )
    elif widths_consistent:
        checks.add(
            "WIDTH_CONSISTENCY", "pass", "Total width is at least usable width.", *width_paths
        )
    else:
        checks.add(
            "WIDTH_CONSISTENCY",
            "not_applicable",
            "A complete pair of widths is not available for a consistency check.",
            *width_paths,
        )

    actual_net = (
        Decimal(supply.actual_net_fabric_mass_kg)
        if supply.actual_net_fabric_mass_kg is not None
        else None
    )
    actual_gross = (
        Decimal(supply.actual_gross_shipment_mass_kg)
        if supply.actual_gross_shipment_mass_kg is not None
        else None
    )
    covers_order = supply.actual_mass_covers_order is True
    contradictory_actual = (
        covers_order
        and actual_net is not None
        and actual_gross is not None
        and actual_gross < actual_net
    )
    net: Decimal | None = None
    if contradictory_actual:
        checks.add(
            "NET_MASS",
            "needs_review",
            "Full-order gross mass is below net fabric mass; clarify both masses.",
            "draft_data.supply_chain.actual_net_fabric_mass_kg",
            "draft_data.supply_chain.actual_gross_shipment_mass_kg",
        )
    elif covers_order and actual_net is not None:
        net = actual_net
        metrics.net_mass_basis = "actual"
        checks.add(
            "NET_MASS",
            "pass",
            "The confirmed actual net fabric mass covers the full order.",
            "draft_data.supply_chain.actual_net_fabric_mass_kg",
            "draft_data.supply_chain.actual_mass_covers_order",
        )
    elif widths_consistent and fabric.gsm is not None:
        net = Decimal(requirement.quantity) * total * Decimal(fabric.gsm) / Decimal("100000")
        metrics.net_mass_basis = "estimated"
        checks.add(
            "NET_MASS",
            "pass",
            "Net mass uses order metres, total width and GSM, excluding packaging.",
            *width_paths,
            "draft_data.textile_specification.gsm",
        )
    else:
        checks.add(
            "NET_MASS",
            "needs_review" if needed else "not_applicable",
            "Net mass is unavailable; gross mass cannot establish kilogram pricing.",
            "draft_data.supply_chain.actual_net_fabric_mass_kg",
            "draft_data.supply_chain.actual_mass_covers_order",
            *width_paths,
            "draft_data.textile_specification.gsm",
        )
    if net is not None:
        metrics.net_fabric_mass_kg = _decimal_text(net)
    if covers_order and actual_gross is not None and net is not None and actual_gross < net:
        checks.add(
            "SHIPMENT_MASS",
            "needs_review",
            "Gross mass is below estimated net mass; review the inputs.",
            "draft_data.supply_chain.actual_gross_shipment_mass_kg",
        )
    elif contradictory_actual:
        checks.add(
            "SHIPMENT_MASS",
            "needs_review",
            "Reported full-order gross mass cannot be below actual net fabric mass.",
            "draft_data.supply_chain.actual_gross_shipment_mass_kg",
        )
    elif covers_order and actual_gross is not None and net is not None:
        checks.add(
            "SHIPMENT_MASS",
            "pass",
            "Reported gross shipment mass is at least net fabric mass.",
            "draft_data.supply_chain.actual_gross_shipment_mass_kg",
        )
    else:
        checks.add(
            "SHIPMENT_MASS",
            "not_applicable",
            "Full-order gross shipment mass is not needed for these cost and requirement checks.",
            "draft_data.supply_chain.actual_gross_shipment_mass_kg",
        )
    return net


def _quantity_in(unit: str | None, requirement: Requirement, net: Decimal | None) -> Decimal | None:
    if unit == "metre":
        return Decimal(requirement.quantity)
    return net if unit == "kg" else None


def _commercial(
    requirement: Requirement,
    data: QuoteData,
    net: Decimal | None,
    metrics: ComparisonMetrics,
    checks: _Checks,
) -> bool:
    terms = data.commercial
    prefix = "draft_data.commercial."
    currency_matches = terms.currency == requirement.currency
    metrics.currency = terms.currency
    checks.add(
        "CURRENCY",
        "pass" if currency_matches else "needs_review",
        "The offer and budget use the same currency."
        if currency_matches
        else "Confirm an offer in the budget currency; no currency conversion is applied.",
        prefix + "currency",
    )
    required_quantity = _quantity_in(terms.quantity_unit, requirement, net)
    quoted_quantity = Decimal(terms.quoted_quantity) if terms.quoted_quantity is not None else None
    quantity_matches = required_quantity is not None and quoted_quantity == required_quantity
    if quantity_matches:
        checks.add(
            "QUOTE_QUANTITY",
            "pass",
            "The quotation quantity covers exactly the required full order.",
            prefix + "quoted_quantity",
            prefix + "quantity_unit",
        )
    elif (
        quoted_quantity is not None
        and required_quantity is not None
        and quoted_quantity < required_quantity
    ):
        checks.add(
            "QUOTE_QUANTITY",
            "fail",
            "The quote covers less than the full order; terms cannot be extended.",
            prefix + "quoted_quantity",
            prefix + "quantity_unit",
        )
    else:
        checks.add(
            "QUOTE_QUANTITY",
            "needs_review",
            "Confirm full-order terms; different or unknown quantities are not scaled.",
            prefix + "quoted_quantity",
            prefix + "quantity_unit",
        )

    moq_quantity = _quantity_in(terms.moq_unit, requirement, net)
    if terms.moq is None or moq_quantity is None:
        checks.add(
            "MOQ",
            "needs_review",
            "The minimum order quantity or its comparable unit is missing.",
            prefix + "moq",
            prefix + "moq_unit",
        )
    else:
        meets_moq = moq_quantity >= Decimal(terms.moq)
        checks.add(
            "MOQ",
            "pass" if meets_moq else "fail",
            "The required order meets the minimum order quantity."
            if meets_moq
            else "The required order is below the minimum order quantity.",
            prefix + "moq",
            prefix + "moq_unit",
        )

    included = {_text(category) for category in terms.included_charges}
    excluded = {_text(category) for category in terms.excluded_charges}
    # Review can establish a declared boundary but cannot make contradictory
    # declarations consistent. Only the app's defined categories are interpreted;
    # other free-text terms still rely on explicit human boundary review.
    contradictory_charges = bool(included & excluded)
    if requirement.cost_basis_id == "delivered_to_buyer_excluding_tax_v1":
        contradictory_charges = contradictory_charges or bool(
            excluded & {"material", "delivery"} or included & {"tax", "duties"}
        )
    cost_basis_matches = (
        terms.cost_basis_id == requirement.cost_basis_id
        and terms.cost_basis_reviewed is True
        and not terms.cost_adjustments
        and not contradictory_charges
    )
    checks.add(
        "COST_BASIS",
        "pass" if cost_basis_matches else "needs_review",
        "Declared charges conflict; clarify inclusions and exclusions before comparing cost."
        if contradictory_charges
        else "The reviewed cost boundary matches the case; no adjustments are added."
        if cost_basis_matches
        else "Confirm a common cost boundary; missing charges are not assumed zero.",
        prefix + "cost_basis_id",
        prefix + "cost_basis_reviewed",
        prefix + "included_charges",
        prefix + "excluded_charges",
    )
    if terms.quote_valid_until is None:
        checks.add(
            "QUOTE_VALIDITY",
            "not_applicable",
            "No quotation expiry is supplied; expiry has not been verified.",
            prefix + "quote_valid_until",
        )
    else:
        valid_on_order_date = terms.quote_valid_until >= requirement.order_reference_date
        checks.add(
            "QUOTE_VALIDITY",
            "pass" if valid_on_order_date else "fail",
            "The quotation is valid on the order reference date."
            if valid_on_order_date
            else "The quotation expires before the order reference date.",
            prefix + "quote_valid_until",
            "requirement.order_reference_date",
        )
    price_quantity = _quantity_in(terms.price_unit, requirement, net)
    quoted_cost: Decimal | None = None
    if terms.unit_price_amount is not None and price_quantity is not None and quantity_matches:
        quoted_cost = Decimal(terms.unit_price_amount) * price_quantity
        metrics.quoted_cost_amount = _decimal_text(quoted_cost)
        checks.add(
            "QUOTED_COST",
            "pass",
            "Full-order cost uses confirmed unit price; kilogram terms use net mass.",
            prefix + "unit_price_amount",
            prefix + "price_unit",
            prefix + "quoted_quantity",
        )
    else:
        checks.add(
            "QUOTED_COST",
            "needs_review",
            "Full-order cost needs a unit price and compatible full-order quantity.",
            prefix + "unit_price_amount",
            prefix + "price_unit",
            prefix + "quoted_quantity",
        )
    if quoted_cost is not None and currency_matches and cost_basis_matches:
        metrics.comparable_cost_amount = _decimal_text(quoted_cost)
        within_budget = quoted_cost <= Decimal(requirement.maximum_budget_amount)
        checks.add(
            "BUDGET",
            "pass" if within_budget else "fail",
            "Full-order comparable cost is within budget."
            if within_budget
            else "Full-order comparable cost exceeds the budget.",
            prefix + "unit_price_amount",
            "requirement.maximum_budget_amount",
        )
    else:
        checks.add(
            "BUDGET",
            "needs_review",
            "Budget needs full-order cost, matching currency and reviewed cost basis.",
            prefix + "unit_price_amount",
            prefix + "cost_basis_id",
            prefix + "currency",
        )
    return quantity_matches


def _delivery(
    requirement: Requirement,
    data: QuoteData,
    quantity_matches: bool,
    metrics: ComparisonMetrics,
    checks: _Checks,
) -> None:
    supply = data.supply_chain
    prefix = "draft_data.supply_chain."
    valid_basis = (
        supply.lead_time_basis == "full_order_calendar_days_to_buyer"
        and supply.lead_time_basis_reviewed is True
    )
    checks.add(
        "DELIVERY_BASIS",
        "pass" if valid_basis else "needs_review",
        "Lead time is reviewed as full-order calendar days to the buyer."
        if valid_basis
        else "Confirm full-order calendar days to buyer; stages are not added blindly.",
        prefix + "lead_time_basis",
        prefix + "lead_time_basis_reviewed",
    )
    days = supply.end_to_end_lead_time_days
    if not valid_basis or days is None or not quantity_matches:
        checks.add(
            "DELIVERY",
            "needs_review",
            "Delivery needs full-order days, reviewed basis and matching quantity.",
            prefix + "end_to_end_lead_time_days",
            "draft_data.commercial.quoted_quantity",
        )
        return
    try:
        arrival_date = requirement.order_reference_date + timedelta(days=days)
    except OverflowError:
        checks.add(
            "DELIVERY",
            "needs_review",
            "The order reference date and lead time exceed the supported calendar range.",
            "requirement.order_reference_date",
            prefix + "end_to_end_lead_time_days",
        )
        return
    metrics.end_to_end_lead_time_days = days
    metrics.arrival_date = arrival_date.isoformat()
    meets_deadline = days <= requirement.maximum_lead_time_days
    checks.add(
        "DELIVERY",
        "pass" if meets_deadline else "fail",
        "The full order arrives within the required lead time."
        if meets_deadline
        else "The full-order lead time exceeds the requirement.",
        prefix + "end_to_end_lead_time_days",
        "requirement.maximum_lead_time_days",
    )


def compare_confirmed_quote(
    requirement: Requirement,
    quote: QuoteRead,
    confirmed: ConfirmedRevision | None,
) -> ComparisonRow:
    """Check only the immutable revision that still matches this quotation."""
    checks = _Checks()
    if not _current_confirmation(quote, confirmed):
        checks.add(
            "CONFIRMATION",
            "needs_review",
            "Confirm the current quotation revision before checking its terms.",
            "confirmation",
        )
        return ComparisonRow(
            quote_id=quote.id,
            source_name=quote.source_file.name,
            supplier_name=None,
            confirmation_revision_id=None,
            draft_revision=quote.draft_revision,
            status="unconfirmed",
            checks=checks.items,
        )
    assert confirmed is not None
    checks.add(
        "CONFIRMATION",
        "pass",
        "These checks use the current immutable human-confirmed revision.",
        "confirmation",
    )
    data = confirmed.validated_data
    metrics = ComparisonMetrics()
    # Source decimals are bounded to 12 integer and 6 fractional digits. Ninety-six
    # digits preserve every product used here, including full geometry and price.
    with localcontext() as context:
        context.prec = 96
        _technical(requirement, data, checks)
        net = _net_mass(requirement, data, metrics, checks)
        quantity_matches = _commercial(requirement, data, net, metrics, checks)
        _delivery(requirement, data, quantity_matches, metrics, checks)
    checks.add(
        "EVIDENCE",
        "needs_review" if requirement.textile_specification.required_evidence else "not_applicable",
        "Evidence acceptance is unavailable in these checks."
        if requirement.textile_specification.required_evidence
        else "No evidence requirement is configured for this case.",
        "requirement.textile_specification.required_evidence",
    )
    if any(check.status == "fail" for check in checks.items):
        status = "does_not_meet_requirements"
    elif any(check.status == "needs_review" for check in checks.items):
        status = "needs_review"
    else:
        status = "meets_checked_requirements"
    return ComparisonRow(
        quote_id=quote.id,
        source_name=quote.source_file.name,
        supplier_name=data.supplier_name,
        confirmation_revision_id=confirmed.id,
        draft_revision=quote.draft_revision,
        status=status,
        metrics=metrics,
        checks=checks.items,
    )


def summarize_tradeoff(rows: list[ComparisonRow]) -> ComparisonTradeoff | None:
    """Describe the cost of faster arrival without choosing an overall winner."""
    candidates = []
    for row in rows:
        metrics = row.metrics
        if (
            row.status != "meets_checked_requirements"
            or row.confirmation_revision_id is None
            or any(check.status in {"fail", "needs_review"} for check in row.checks)
            or metrics.comparable_cost_amount is None
            or metrics.currency is None
            or not re.fullmatch(r"[A-Z]{3}", metrics.currency)
            or type(metrics.end_to_end_lead_time_days) is not int
            or metrics.end_to_end_lead_time_days < 0
        ):
            continue
        cost = Decimal(metrics.comparable_cost_amount)
        if cost <= 0:
            continue
        candidates.append((row, cost, metrics.end_to_end_lead_time_days))
    if (
        len(candidates) < 2
        or len({row.metrics.currency for row, _, _ in candidates}) != 1
        or len({row.quote_id for row, _, _ in candidates}) != len(candidates)
    ):
        return None
    cheaper, lower_cost, cheaper_days = min(
        candidates, key=lambda item: (item[1], item[2], item[0].quote_id)
    )
    faster, higher_cost, faster_days = min(
        candidates, key=lambda item: (item[2], item[1], item[0].quote_id)
    )
    if (
        cheaper.quote_id == faster.quote_id
        or higher_cost <= lower_cost
        or faster_days >= cheaper_days
    ):
        return None
    # CalculatedDecimal inputs have at most 128 characters. Keep subtraction exact
    # even when the caller's Decimal context is smaller or the scales differ widely.
    with localcontext() as context:
        context.prec = 256
        difference = _decimal_text(higher_cost - lower_cost)
    if len(difference) > 128:
        return None
    return ComparisonTradeoff(
        cheaper_quote_id=cheaper.quote_id,
        faster_quote_id=faster.quote_id,
        currency=cheaper.metrics.currency,
        additional_cost_amount=difference,
        delivery_days_saved=cheaper_days - faster_days,
    )
