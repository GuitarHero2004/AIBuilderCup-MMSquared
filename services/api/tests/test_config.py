import pytest
from pydantic import ValidationError

from app.config import Settings


def local_config():
    return {
        "app_env": "local",
        "google_cloud_project": "demo-greenprocure",
        "firebase_auth_emulator_host": "127.0.0.1:9099",
        "firestore_emulator_host": "127.0.0.1:8080",
        "app_check_required": False,
        "allowed_origins": ["http://localhost:5173"],
    }


@pytest.mark.parametrize(
    "change",
    [
        {"google_cloud_project": "production-project"},
        {"firestore_emulator_host": None},
        {"firebase_auth_emulator_host": "remote.example:9099"},
        {"firestore_emulator_host": "http://127.0.0.1:8080"},
        {"allowed_origins": ["*"]},
        {"allowed_origins": ["https://example.com"]},
        {"allowed_origins": ["http://localhost:5173/path"]},
        {"app_env": "production"},
    ],
)
def test_local_cannot_leak_into_real_services(change):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **(local_config() | change))


def production_config():
    return {
        "app_env": "production",
        "google_cloud_project": "greenprocure-prod",
        "app_check_required": True,
        "app_check_app_ids": ["1:123:web:abc"],
        "allowed_origins": ["https://example.web.app"],
    }


@pytest.mark.parametrize(
    "change",
    [
        {"google_cloud_project": "demo-greenprocure"},
        {"firebase_auth_emulator_host": "127.0.0.1:9099"},
        {"app_check_required": False},
        {"app_check_app_ids": []},
        {"allowed_origins": ["http://localhost:5173"]},
    ],
)
def test_production_fails_closed(change):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **(production_config() | change))


@pytest.mark.parametrize(
    "key",
    [
        "FIREBASE_AUTH_EMULATOR_HOST",
        "FIRESTORE_EMULATOR_HOST",
        "FIREBASE_APPCHECK_DEBUG_TOKEN",
        "GOOGLE_APPLICATION_CREDENTIALS",
    ],
)
def test_ambient_unsafe_configuration_rejected(monkeypatch, key):
    monkeypatch.setenv(key, "unsafe-setting")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **production_config())


def test_unconfigured_environment_does_not_start():
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_valid_production_configuration_does_not_need_credentials_to_parse():
    assert Settings(_env_file=None, **production_config()).app_check_required is True


def test_emulator_download_cache_is_not_an_sdk_endpoint(monkeypatch):
    monkeypatch.setenv("FIREBASE_EMULATORS_PATH", "C:/workspace/.local/emulators")
    assert Settings(_env_file=None, **production_config()).app_env == "production"
