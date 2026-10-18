from decimal import Decimal

import pytest


def headers(owner="alice"):
    return {"Authorization": f"Bearer {owner}"}


def test_health_is_liveness_not_ai_claim(client):
    assert client.get("/healthz").json() == {
        "status": "ok",
        "environment": "local",
        "storage": "firestore",
        "ai_enabled": False,
    }


def test_create_list_reload_and_isolation(client, payload):
    result = client.post("/api/v1/cases", headers=headers(), json=payload)
    assert result.status_code == 201
    case = result.json()
    assert case["requirement"] == payload["requirement"]
    assert case["default_policy"]["weights"] == {
        "cost": "0.45",
        "lead_time": "0.25",
        "carbon": "0.30",
    }
    assert sum(map(Decimal, case["default_policy"]["weights"].values())) == 1
    assert case["is_synthetic_demo"] is True
    assert case["data_revision"] == 1
    assert client.get(f"/api/v1/cases/{case['id']}", headers=headers()).json() == case
    assert client.get("/api/v1/cases", headers=headers()).json() == {"items": [case]}
    assert client.get("/api/v1/cases", headers=headers("bob")).json() == {"items": []}
    denied = client.get(f"/api/v1/cases/{case['id']}", headers=headers("bob"))
    unknown = client.get("/api/v1/cases/" + "0" * 32, headers=headers("bob"))
    assert denied.status_code == unknown.status_code == 404
    assert denied.json()["error"]["code"] == unknown.json()["error"]["code"] == "CASE_NOT_FOUND"


@pytest.mark.parametrize(
    "authorization", [None, "alice", "Basic alice", "Bearer ", "Bearer invalid"]
)
def test_auth_required_for_all_business_routes(client, payload, authorization):
    request_headers = {} if authorization is None else {"Authorization": authorization}
    responses = [
        client.get("/api/v1/cases", headers=request_headers),
        client.post("/api/v1/cases", json=payload, headers=request_headers),
        client.get("/api/v1/cases/" + "0" * 32, headers=request_headers),
    ]
    assert all(response.status_code == 401 for response in responses)
    for response in responses:
        assert response.json()["error"]["request_id"] == response.headers["X-Request-ID"]
        assert response.json()["error"]["run_id"] is None


@pytest.mark.parametrize("name", ["", "   ", "a" * 161, "line\nbreak", 10, None])
def test_invalid_names_rejected(client, payload, name):
    payload["name"] = name
    response = client.post("/api/v1/cases", json=payload, headers=headers())
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"
    assert client.get("/api/v1/cases", headers=headers()).json() == {"items": []}


@pytest.mark.parametrize(
    "amount", ["0", "-1", "NaN", "Infinity", "1e4", "01", 50000, True, "1.1234567"]
)
def test_invalid_quantities_rejected(client, payload, amount):
    payload["requirement"]["quantity"] = amount
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422


@pytest.mark.parametrize("date", ["2026-02-30", "04/10/2026", 1791072000, "2026-10-04T00:00:00Z"])
def test_dates_must_be_real_iso_calendar_dates(client, payload, date):
    payload["requirement"]["order_reference_date"] = date
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422


@pytest.mark.parametrize(
    "extra", ["uid", "owner_uid", "default_policy", "is_synthetic_demo", "data_revision"]
)
def test_client_cannot_supply_authority_or_server_fields(client, payload, extra):
    payload[extra] = "bob"
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422


def test_nested_extras_rejected(client, payload):
    payload["requirement"]["owner_uid"] = "bob"
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422


def test_case_cap_is_per_owner(client, payload):
    for _ in range(2):
        assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 201
    blocked = client.post("/api/v1/cases", json=payload, headers=headers())
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "CASE_LIMIT_REACHED"
    assert client.post("/api/v1/cases", json=payload, headers=headers("bob")).status_code == 201


@pytest.mark.parametrize("case_id", ["bad", "..", "owner:case", "A" * 32])
def test_invalid_case_ids_not_found(client, case_id):
    assert client.get(f"/api/v1/cases/{case_id}", headers=headers()).status_code == 404


def test_composition_sum_and_duplicate_names(client, payload):
    parts = payload["requirement"]["textile_specification"]["composition"]
    parts[1]["percentage"] = "34.89"
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422
    parts[1]["percentage"] = "34.9"
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 201
    parts[1]["fibre"] = "polyester"
    assert client.post("/api/v1/cases", json=payload, headers=headers()).status_code == 422


def test_openapi_exposes_implemented_quotation_contract(client):
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) == {
        "/healthz",
        "/api/v1/cases",
        "/api/v1/cases/{case_id}",
        "/api/v1/cases/{case_id}/comparison",
        "/api/v1/cases/{case_id}/quotes",
        "/api/v1/cases/{case_id}/quote-intakes/{request_key}",
        "/api/v1/cases/{case_id}/quotation-operations/{request_key}/cancel",
        "/api/v1/cases/{case_id}/quotes/{quote_id}",
        "/api/v1/cases/{case_id}/quotes/{quote_id}/document",
        "/api/v1/cases/{case_id}/quotes/{quote_id}/draft",
        "/api/v1/cases/{case_id}/quotes/{quote_id}/confirm",
        "/api/v1/cases/{case_id}/quotes/{quote_id}/review-operations/{request_key}",
        "/api/v1/cases/{case_id}/quotes/{quote_id}/revisions/{revision_id}",
        "/api/v1/cases/{case_id}/agent-runs",
        "/api/v1/cases/{case_id}/run-operations/{request_key}",
        "/api/v1/cases/{case_id}/runs/{run_id}",
        "/api/v1/cases/{case_id}/runs/{run_id}/events",
    }
    models = schema["components"]["schemas"]
    assert models["CaseCreate"]["additionalProperties"] is False
    assert models["Requirement"]["properties"]["quantity"]["type"] == "string"
