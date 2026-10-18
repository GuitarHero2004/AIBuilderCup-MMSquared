"""Server-owned assistant grounding and deterministic answer rendering."""

import json
from decimal import Decimal

from app.errors import ApiError
from app.models.assistant import AssistantAction, AssistantFact, AssistantNarrative, AssistantResult
from app.models.cases import CaseRead
from app.services.comparison import ComparisonService
from app.services.quotations import QuotationService, digest, flatten
from app.services.selections import SelectionService

SCOPE = (
    "This assistant explains saved synthetic data and limited requirement checks. "
    "It cannot approve quotations, save buyer decisions, send messages, or claim a carbon ranking."
)
AUTHORITY_FIELDS = {
    "commercial.cost_basis_id",
    "commercial.cost_basis_reviewed",
    "supply_chain.lead_time_basis_reviewed",
    "supply_chain.carbon_scope_id",
}


FIELD_LABELS = {
    "supplier_name": "Supplier name",
    "textile_specification.construction": "Construction",
    "textile_specification.composition": "Fibre composition",
    "textile_specification.gsm": "Fabric weight",
    "textile_specification.usable_width_cm": "Usable width",
    "textile_specification.total_width_cm": "Total width",
    "textile_specification.colour": "Colour",
    "textile_specification.finish": "Finish",
    "textile_specification.recycled_content_pct": "Claimed recycled content",
    "commercial.quoted_quantity": "Quoted quantity",
    "commercial.quantity_unit": "Quantity unit",
    "commercial.unit_price_amount": "Unit price",
    "commercial.price_unit": "Price unit",
    "commercial.currency": "Currency",
    "commercial.moq": "Minimum order quantity",
    "commercial.moq_unit": "Minimum order unit",
    "commercial.incoterm_text": "Quoted Incoterm",
    "commercial.payment_terms": "Payment terms",
    "commercial.quote_valid_until": "Quote valid until",
    "commercial.cost_basis_id": "Comparison cost boundary",
    "commercial.included_charges": "Included charges",
    "commercial.excluded_charges": "Excluded charges",
    "commercial.cost_basis_reviewed": "Cost boundary established",
    "supply_chain.production_lead_time_days": "Production time",
    "supply_chain.shipping_lead_time_days": "Shipping time",
    "supply_chain.end_to_end_lead_time_days": "Full-order lead time",
    "supply_chain.lead_time_basis": "Delivery basis",
    "supply_chain.lead_time_basis_reviewed": "Delivery basis established",
    "supply_chain.actual_net_fabric_mass_kg": "Actual net fabric mass",
    "supply_chain.actual_gross_shipment_mass_kg": "Actual gross shipment mass",
    "supply_chain.actual_mass_covers_order": "Actual mass covers the full order",
    "supply_chain.packaging_mass_kg": "Packaging mass",
    "supply_chain.carbon_scope_id": "Transport boundary",
    "supply_chain.route_complete": "Complete origin-to-buyer route",
    "evidence_claims": "Document and certificate claims",
    "supply_chain.legs": "Transport route details",
}


def field_label(path):
    if path in FIELD_LABELS:
        return FIELD_LABELS[path]
    if path.startswith("textile_specification.composition["):
        return "Fibre composition"
    return path.rsplit(".", 1)[-1].replace("_", " ").capitalize()


def review_path(path):
    if path.startswith("textile_specification.composition["):
        return "textile_specification.composition"
    return path


def readable_status(status):
    return {
        "uploaded": "PDF saved; extraction not started",
        "extracting": "Extraction in progress",
        "needs_review": "Saved information needs review",
        "confirmed": "Saved revision confirmed by buyer",
        "failed": "Extraction failed; source PDF retained",
        "unconfirmed": "Not confirmed for comparison",
        "meets_checked_requirements": "Meets the displayed requirement checks",
        "does_not_meet_requirements": "Does not meet the displayed requirement checks",
    }.get(status, status)


def source_digest(value):
    # Firestore timestamps are compared as stable text; this is not a calculation.
    return digest(json.loads(json.dumps(value, sort_keys=True, default=str)))


def comparison_with_guards(repo, principal, case_id, revision, maximum_quotes):
    comparison, docs = ComparisonService(repo, maximum_quotes).run(
        principal, case_id, revision, accept=lambda value, inputs: ((value, inputs), {})
    )
    paths = {"ctx_index": "intake_state/index"}
    hashes = {"case": source_digest(docs["case"]), "ctx_index": source_digest(docs["index"])}
    for row in comparison.rows:
        key = f"ctx_quote_{row.quote_id}"
        paths[key] = f"quotes/{row.quote_id}"
        hashes[key] = source_digest(docs[f"quote_{row.quote_id}"])
        if row.confirmation_revision_id:
            key = f"ctx_revision_{row.quote_id}"
            paths[key] = f"quotes/{row.quote_id}/revisions/{row.confirmation_revision_id}"
            hashes[key] = source_digest(docs[f"revision_{row.quote_id}"])
    return comparison, {"paths": paths, "hashes": hashes}


def display_decimal(value):
    """Group exact decimal text for display without arithmetic or float conversion."""
    text = format(Decimal(value), ",f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def requirement_facts(requirement):
    spec = requirement.textile_specification
    composition = "; ".join(f"{part.percentage}% {part.fibre}" for part in spec.composition)
    values = [
        ("order_quantity", "Order quantity", f"{display_decimal(requirement.quantity)} metres"),
        (
            "budget",
            "Maximum budget",
            f"{requirement.currency} {display_decimal(requirement.maximum_budget_amount)}",
        ),
        (
            "delivery_limit",
            "Full-order delivery limit",
            f"{requirement.maximum_lead_time_days} calendar days",
        ),
        ("order_date", "Order reference date", str(requirement.order_reference_date)),
        ("destination", "Buyer destination", requirement.destination.label),
        ("fabric", "Fabric requirement", f"{spec.construction}; {composition}"),
        (
            "fabric_weight",
            "Fabric weight requirement",
            f"{spec.target_gsm} GSM; tolerance {spec.gsm_tolerance_pct}%",
        ),
        ("usable_width", "Minimum usable width", f"{spec.minimum_usable_width_cm} cm"),
        ("cost_scope", "Comparison cost scope", requirement.cost_basis_description),
    ]
    return [
        AssistantFact(id=f"requirement_{key}", label=label, value=value)
        for key, label, value in values
    ]


def build_context(repo, principal, case_id, payload, maximum_quotes=4):
    """Re-read all authoritative sources. Browser hints never supply business values."""
    docs = repo.read(principal.uid, case_id, {})
    case = CaseRead.model_validate(docs["case"])
    if case.id != case_id or case.data_revision != payload.expected_case_revision:
        raise ApiError(409, "STALE_CASE_REVISION", "The case changed. Refresh before asking again.")
    facts = [AssistantFact(id="scope", label="Assistant scope", value=SCOPE)]
    actions = []
    gaps = {}
    review_fields = {}
    source = {"case": case.model_dump(mode="json"), "intent": payload.intent}
    requirement = case.requirement
    guards = {"paths": {}, "hashes": {"case": source_digest(docs["case"])}}
    if payload.has_unsaved_changes:
        facts.append(
            AssistantFact(
                id="unsaved_changes",
                label="Saved state only",
                value="Browser edits were not read. This answer describes the saved revision only.",
            )
        )
    if payload.intent == "quote_help":
        raw = repo.read(principal.uid, case_id, {"quote": f"quotes/{payload.quote_id}"})
        if raw["case"]["data_revision"] != case.data_revision:
            raise ApiError(
                409, "STALE_CASE_REVISION", "The case changed. Refresh before asking again."
            )
        if not raw["quote"]:
            raise ApiError(404, "QUOTE_NOT_FOUND", "This quotation is unavailable in this case.")
        quote = QuotationService._public(raw["quote"], raw["case"])
        guards["paths"]["ctx_quote"] = f"quotes/{payload.quote_id}"
        guards["hashes"]["ctx_quote"] = source_digest(raw["quote"])
        guards["hashes"]["case"] = source_digest(raw["case"])
        if quote.id != payload.quote_id or quote.case_id != case_id:
            raise ApiError(404, "QUOTE_NOT_FOUND", "This quotation is unavailable in this case.")
        if quote.draft_revision != payload.expected_draft_revision:
            raise ApiError(
                409, "STALE_DRAFT_REVISION", "The saved draft changed. Refresh it first."
            )
        # Exclude raw PDF/extraction text; preserve the saved confirmation state.
        source["quote"] = quote.model_dump(mode="json", exclude={"raw_extraction", "latest_run"})
        facts.append(
            AssistantFact(
                id="quote_status",
                label="Saved quotation status",
                value=readable_status(quote.status),
                quote_id=quote.id,
            )
        )
        facts.append(
            AssistantFact(
                id="review_boundary",
                label="Review authority",
                value="Only the buyer can explicitly confirm the saved quotation revision.",
                quote_id=quote.id,
            )
        )
        values = flatten(quote.draft_data.model_dump(mode="json")) if quote.draft_data else {}
        for i, issue in enumerate(quote.issues[:40]):
            fact_id = f"issue_{i}"
            facts.append(
                AssistantFact(
                    id=fact_id,
                    label=field_label(issue.field_path),
                    value=issue.message[:2000],
                    quote_id=quote.id,
                )
            )
            path = issue.field_path
            if not path.endswith((".factor_id", ".leg_id")):
                review_fields[fact_id] = {"path": review_path(path), "label": field_label(path)}
            if (
                path in values
                and issue.code == "MISSING_INFORMATION"
                and (values[path] is None or values[path] == [] or values[path] == "")
                and path not in AUTHORITY_FIELDS
                and not path.endswith((".factor_id", ".leg_id", "_source_type", "_source_note"))
            ):
                gaps[path] = fact_id
        if not quote.issues:
            facts.append(
                AssistantFact(
                    id="review_state",
                    label="Saved review",
                    value="No saved review issues are listed."
                    if quote.draft_data
                    else "No draft exists yet. Extract the saved PDF from quotation intake.",
                    quote_id=quote.id,
                )
            )
        if quote.draft_data:
            actions.append(
                AssistantAction(
                    kind="open_review",
                    label="Open saved quotation review",
                    case_id=case_id,
                    quote_id=quote.id,
                    expected_case_revision=case.data_revision,
                )
            )
    else:
        if payload.intent == "explain_selection":
            selection = SelectionService(repo, maximum_quotes).get(
                principal, case_id, payload.selection_id
            )
            comparison = selection.selection.comparison_snapshot
            requirement = comparison.requirement
            _, guards = comparison_with_guards(
                repo, principal, case_id, payload.expected_case_revision, maximum_quotes
            )
            selected_raw = repo.read(
                principal.uid, case_id, {"selection": f"selections/{payload.selection_id}"}
            )["selection"]
            if (
                SelectionService._record(selected_raw, principal, case_id, payload.selection_id)
                != selection.selection
            ):
                raise ApiError(
                    409, "ASSISTANT_INPUT_CHANGED", "The saved note changed during readback."
                )
            guards["paths"]["ctx_selection"] = f"selections/{payload.selection_id}"
            guards["hashes"]["ctx_selection"] = source_digest(selected_raw)
            source["selection"] = selection.model_dump(mode="json")
            source["selection"]["selection"]["comparison_snapshot"].pop("checked_at", None)
            facts.extend(
                [
                    AssistantFact(
                        id="selection_reason",
                        label="Buyer's saved reason",
                        value=selection.selection.selection_reason,
                        quote_id=selection.selection.selected_quote_id,
                    ),
                    AssistantFact(
                        id="selection_freshness",
                        label="Saved snapshot freshness",
                        value=selection.current_context.message,
                    ),
                    AssistantFact(
                        id="selection_boundary",
                        label="Historical buyer note",
                        value="This is a historical buyer note, not a new approval.",
                    ),
                ]
            )
            actions.append(
                AssistantAction(
                    kind="open_selection",
                    label="Open saved buyer note",
                    case_id=case_id,
                    selection_id=payload.selection_id,
                    expected_case_revision=case.data_revision,
                )
            )
        else:
            comparison, guards = comparison_with_guards(
                repo, principal, case_id, payload.expected_case_revision, maximum_quotes
            )
            source["comparison"] = comparison.model_dump(mode="json", exclude={"checked_at"})
            if (
                payload.expected_input_fingerprint is not None
                and payload.expected_input_fingerprint != comparison.input_fingerprint
            ):
                raise ApiError(409, "STALE_COMPARISON", "The comparison changed. Refresh it first.")
        names = {row.quote_id: (row.supplier_name or row.source_name) for row in comparison.rows}
        for i, row in enumerate(comparison.rows):
            name = names[row.quote_id][:160]
            facts.append(
                AssistantFact(
                    id=f"offer_{i}_status",
                    label=f"{name}: saved checks",
                    value=readable_status(row.status),
                    quote_id=row.quote_id,
                )
            )
            if row.metrics.comparable_cost_amount is not None:
                facts.append(
                    AssistantFact(
                        id=f"offer_{i}_cost",
                        label=f"{name}: comparable cost",
                        value=f"{row.metrics.currency} "
                        f"{display_decimal(row.metrics.comparable_cost_amount)}",
                        quote_id=row.quote_id,
                    )
                )
            if row.metrics.end_to_end_lead_time_days is not None:
                facts.append(
                    AssistantFact(
                        id=f"offer_{i}_delivery",
                        label=f"{name}: full-order delivery",
                        value=f"{row.metrics.end_to_end_lead_time_days} calendar days",
                        quote_id=row.quote_id,
                    )
                )
            for j, check in enumerate(
                c for c in row.checks if c.status in {"fail", "needs_review"}
            ):
                if j >= 6:
                    break
                facts.append(
                    AssistantFact(
                        id=f"offer_{i}_check_{j}",
                        label=f"{name}: {check.code.replace('_', ' ').lower()}",
                        value=check.message[:2000],
                        quote_id=row.quote_id,
                    )
                )
        if comparison.tradeoff_summary:
            t = comparison.tradeoff_summary
            facts.append(
                AssistantFact(
                    id="tradeoff",
                    label="Confirmed cost and delivery trade-off",
                    value=f"{names[t.faster_quote_id]} costs "
                    f"{t.currency} {display_decimal(t.additional_cost_amount)} more "
                    f"than {names[t.cheaper_quote_id]} and arrives "
                    f"{t.delivery_days_saved} calendar days sooner. "
                    "This does not establish an overall winner.",
                    quote_id=t.faster_quote_id,
                )
            )
        facts.append(
            AssistantFact(
                id="comparison_boundary",
                label="Comparison limitations",
                value=(
                    "These checks use the confirmed inputs frozen in this saved buyer note. "
                    if payload.intent == "explain_selection"
                    else "These checks use the current confirmed quotation inputs. "
                )
                + "No carbon estimate, preference ranking, supplier-risk assessment or purchase "
                "approval is available.",
            )
        )
        if not comparison.rows:
            facts.append(
                AssistantFact(
                    id="intake_guidance",
                    label="Next step for this case",
                    value="No PDFs have been added. Add a synthetic quotation, extract "
                    "its terms, then review and confirm the saved information before comparison.",
                )
            )
            actions.append(
                AssistantAction(
                    kind="open_intake",
                    label="Add quotation PDFs",
                    case_id=case_id,
                    expected_case_revision=case.data_revision,
                )
            )
        else:
            unresolved = next(
                (row for row in comparison.rows if row.status in {"unconfirmed", "needs_review"}),
                None,
            )
            if unresolved is not None and payload.intent != "explain_selection":
                if unresolved.draft_revision > 0:
                    facts.append(
                        AssistantFact(
                            id="intake_guidance",
                            label="Next review step",
                            value="Review saved quotation details against their source PDF. "
                            "A missing or unconfirmed input is not a passing requirement check.",
                        )
                    )
                    actions.append(
                        AssistantAction(
                            kind="open_review",
                            label=f"Review {names[unresolved.quote_id][:100]}",
                            case_id=case_id,
                            quote_id=unresolved.quote_id,
                            expected_case_revision=case.data_revision,
                        )
                    )
                else:
                    facts.append(
                        AssistantFact(
                            id="intake_guidance",
                            label="Next extraction step",
                            value="Extract and review the saved PDF before comparison.",
                        )
                    )
                    actions.append(
                        AssistantAction(
                            kind="open_intake",
                            label="Open quotation intake",
                            case_id=case_id,
                            expected_case_revision=case.data_revision,
                        )
                    )
            actions.append(
                AssistantAction(
                    kind="open_comparison",
                    label="Open current comparison",
                    case_id=case_id,
                    expected_case_revision=case.data_revision,
                )
            )
    facts.extend(requirement_facts(requirement))
    # Catch changes that occurred during multi-document grounding before spending a model call.
    latest = repo.read(principal.uid, case_id, {})["case"]
    if latest["data_revision"] != case.data_revision:
        raise ApiError(409, "STALE_CASE_REVISION", "The case changed. Refresh before asking again.")
    return {
        "intent": payload.intent,
        "case_id": case_id,
        "source_fingerprint": digest(source),
        "facts": [f.model_dump(mode="json") for f in facts],
        "gaps": gaps,
        "review_fields": review_fields,
        "source_guards": guards,
        "actions": []
        if payload.has_unsaved_changes
        else [a.model_dump(mode="json") for a in actions],
    }


def render_result(context: dict, narrative: AssistantNarrative) -> AssistantResult:
    available = {f["id"]: f for f in context["facts"]}
    refs = narrative.referenced_fact_ids
    expected_focus = {
        "quote_help": "review_gaps",
        "explain_comparison": "checked_tradeoff",
        "explain_selection": "saved_selection",
    }[context["intent"]]
    if (
        len(refs) != len(set(refs))
        or not set(refs) <= available.keys()
        or narrative.focus not in {expected_focus, "limitations"}
        or len(narrative.clarification_field_paths) != len(set(narrative.clarification_field_paths))
        or not set(narrative.clarification_field_paths) <= context["gaps"].keys()
    ):
        raise ApiError(
            502, "INVALID_ASSISTANT_RESULT", "The assistant response could not be grounded."
        )
    mandatory = [
        key
        for key in (
            "scope",
            "unsaved_changes",
            "review_boundary",
            "selection_freshness",
            "selection_boundary",
            "comparison_boundary",
            "intake_guidance",
        )
        if key in available
    ]
    chosen_ids = list(dict.fromkeys([*refs, *mandatory]))
    facts = [available[key] for key in chosen_ids]
    selected = [available[key] for key in refs if key not in mandatory]
    if narrative.focus == "limitations":
        summary = SCOPE
        actions = []
    else:
        heading = {
            "review_gaps": "For the saved quotation:",
            "checked_tradeoff": "From the confirmed requirement checks:",
            "saved_selection": "From the saved buyer note:",
        }[narrative.focus]
        if narrative.focus == "checked_tradeoff" and not any(
            fact["id"] == "tradeoff"
            or (fact["id"].startswith("offer_") and fact["id"].endswith(("_cost", "_delivery")))
            for fact in selected
        ):
            heading = "From this saved sourcing case:"
        lines = [heading]
        for fact in selected:
            line = f"{fact['label']}: {fact['value']}"
            if sum(len(item) + 1 for item in lines) + len(line) > 2700:
                break
            lines.append(line)
        if len(lines) == 1:
            lines.append(
                available["intake_guidance"]["value"]
                if "intake_guidance" in available
                else "The selected scope and review limitations are shown below."
            )
        summary = "\n".join(lines)
        actions = list(context["actions"])
        if narrative.focus == "review_gaps" and actions:
            first_issue = next(
                (context["review_fields"][key] for key in refs if key in context["review_fields"]),
                None,
            )
            if first_issue:
                actions[0] = {
                    **actions[0],
                    "field_path": first_issue["path"],
                    "label": f"Check {first_issue['label'].lower()}"[:160],
                }
    draft = None
    if narrative.clarification_field_paths and narrative.focus == "review_gaps":
        questions = [
            "- Please confirm the " + field_label(path).lower() + "."
            for path in narrative.clarification_field_paths
        ]
        draft = "Please clarify the following missing quotation information:\n" + "\n".join(
            questions
        )
        draft += "\nPlease provide the relevant terms or source evidence. Thank you."
    return AssistantResult(
        summary=summary,
        clarification_draft=draft,
        facts=facts,
        referenced_fact_ids=refs,
        actions=actions,
    )
