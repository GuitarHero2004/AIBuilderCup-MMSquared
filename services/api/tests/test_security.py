from unittest.mock import Mock

import pytest
from firebase_admin.exceptions import UnavailableError

from app.config import Settings
from app.errors import ApiError
from app.security import FirebaseIdentityVerifier


@pytest.fixture
def verifier(monkeypatch):
    monkeypatch.setattr("firebase_admin.initialize_app", Mock(return_value=object()))
    settings = Settings(
        _env_file=None,
        app_env="production",
        google_cloud_project="greenprocure-prod",
        app_check_app_ids=["1:123:web:allowed"],
        allowed_origins=["https://example.web.app"],
    )
    return FirebaseIdentityVerifier(settings)


def test_sdk_verifies_token_revocation_and_allowed_app(verifier, monkeypatch):
    auth = Mock(return_value={"uid": "alice", "firebase": {"sign_in_provider": "anonymous"}})
    appcheck = Mock(return_value={"app_id": "1:123:web:allowed"})
    monkeypatch.setattr("app.security.auth.verify_id_token", auth)
    monkeypatch.setattr("app.security.app_check.verify_token", appcheck)
    assert verifier.verify("id-token", "app-token").uid == "alice"
    auth.assert_called_once_with("id-token", app=verifier.app, check_revoked=True)
    appcheck.assert_called_once_with("app-token", app=verifier.app)


@pytest.mark.parametrize("token", [None, "bad-app"])
def test_missing_or_wrong_app_cannot_authorize(verifier, monkeypatch, token):
    monkeypatch.setattr(
        "app.security.auth.verify_id_token",
        Mock(
            return_value={
                "uid": "alice",
                "firebase": {"sign_in_provider": "anonymous"},
            }
        ),
    )
    monkeypatch.setattr(
        "app.security.app_check.verify_token", Mock(return_value={"app_id": "other"})
    )
    with pytest.raises(ApiError) as error:
        verifier.verify("id-token", token)
    assert error.value.status == 403


def test_invalid_sdk_identity_rejected(verifier, monkeypatch):
    monkeypatch.setattr(
        "app.security.auth.verify_id_token", Mock(side_effect=ValueError("bad jwt"))
    )
    with pytest.raises(ApiError) as error:
        verifier.verify("invalid", "app-token")
    assert error.value.status == 401


def test_environment_switch_after_startup_cannot_enable_unsigned_tokens(verifier, monkeypatch):
    sdk = Mock()
    monkeypatch.setattr("app.security.auth.verify_id_token", sdk)
    monkeypatch.setenv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099")
    with pytest.raises(ApiError) as error:
        verifier.verify("unsigned", "app-token")
    assert error.value.code == "INVALID_CONFIGURATION"
    sdk.assert_not_called()


def test_provider_outage_is_retryable_without_calling_storage(verifier, monkeypatch):
    monkeypatch.setattr(
        "app.security.auth.verify_id_token", Mock(side_effect=UnavailableError("private detail"))
    )
    with pytest.raises(ApiError) as error:
        verifier.verify("id-token", "app-token")
    assert error.value.status == 503
    assert error.value.retryable
    assert "private detail" not in error.value.message
