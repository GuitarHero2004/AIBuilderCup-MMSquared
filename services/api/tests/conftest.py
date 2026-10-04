"""Credential-free test doubles are injected only into test application instances."""

from copy import deepcopy
from threading import Lock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import ApiError
from app.main import create_app
from app.security import Principal


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch, request):
    if request.node.get_closest_marker("integration") or request.node.get_closest_marker("live"):
        return
    for key in (
        "APP_ENV",
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "FIREBASE_AUTH_EMULATOR_HOST",
        "FIRESTORE_EMULATOR_HOST",
        "FIREBASE_STORAGE_EMULATOR_HOST",
        "FIREBASE_APPCHECK_DEBUG_TOKEN",
        "APP_CHECK_REQUIRED",
        "APP_CHECK_APP_IDS",
        "ALLOWED_ORIGINS",
    ):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        app_env="local",
        google_cloud_project="demo-greenprocure",
        firebase_auth_emulator_host="127.0.0.1:9099",
        firestore_emulator_host="127.0.0.1:8080",
        app_check_required=False,
        allowed_origins=["http://localhost:5173"],
    )


class MemoryCases:
    """No production module imports this repository."""

    def __init__(self):
        self.items = {}
        self.lock = Lock()

    def create(self, owner_uid, case, maximum_cases):
        with self.lock:
            cases = self.items.setdefault(owner_uid, {})
            if len(cases) >= maximum_cases:
                raise ApiError(429, "CASE_LIMIT_REACHED", "This demo session can hold two cases.")
            cases[case.id] = case
        return case

    def list_for_owner(self, owner_uid):
        return list(self.items.get(owner_uid, {}).values())

    def get(self, owner_uid, case_id):
        return self.items.get(owner_uid, {}).get(case_id)


class TestIdentity:
    def verify(self, id_token, app_check_token):
        if id_token not in {"alice", "bob"}:
            raise ApiError(401, "INVALID_IDENTITY", "Invalid test identity.")
        return Principal(id_token)


@pytest.fixture
def client(settings):
    with TestClient(
        create_app(settings, repository=MemoryCases(), identity_verifier=TestIdentity())
    ) as client:
        yield client


@pytest.fixture
def payload():
    return deepcopy(
        {
            "name": "Synthetic fabric order",
            "requirement": {
                "quantity": "50000",
                "quantity_unit": "metre",
                "order_reference_date": "2026-10-04",
                "maximum_lead_time_days": 25,
                "maximum_budget_amount": "150000.00",
                "currency": "USD",
                "destination": {"label": "Fictional HCMC buyer facility", "country_code": "VN"},
                "cost_basis_id": "delivered_to_buyer_excluding_tax_v1",
                "cost_basis_description": "Material and delivery; excludes taxes and duties",
                "carbon_scope_id": "origin_facility_to_buyer_facility_v1",
                "carbon_accounting_boundary": "wtw",
                "textile_specification": {
                    "construction": "woven",
                    "composition": [
                        {"fibre": "polyester", "percentage": "65"},
                        {"fibre": "cotton", "percentage": "35"},
                    ],
                    "composition_tolerance_pp": "2",
                    "target_gsm": "130",
                    "gsm_tolerance_pct": "5",
                    "minimum_usable_width_cm": "150",
                    "required_colour": None,
                    "required_finish": None,
                    "required_evidence": [],
                },
            },
        }
    )
