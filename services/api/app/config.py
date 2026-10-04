"""Fail-closed configuration: isolated emulators or an explicitly configured public backend."""

import ipaddress
import os
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def is_loopback_host_port(value: str) -> bool:
    parsed = urlsplit("//" + value)
    try:
        port = parsed.port
    except ValueError:
        return False
    if not port or parsed.path or parsed.query or parsed.fragment or parsed.username:
        return False
    if parsed.hostname == "localhost":
        return True
    try:
        return ipaddress.ip_address(parsed.hostname or "").is_loopback
    except ValueError:
        return False


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="forbid", frozen=True)

    app_env: Literal["local", "production"] = "production"
    google_cloud_project: str = Field(pattern=r"^[a-z][a-z0-9-]{4,28}[a-z0-9]$")
    firebase_auth_emulator_host: str | None = None
    firestore_emulator_host: str | None = None
    firebase_storage_emulator_host: str | None = None
    app_check_required: bool = True
    app_check_app_ids: list[str] = Field(default_factory=list)
    allowed_origins: list[str] = Field(min_length=1)
    maximum_cases_per_user: int = Field(default=2, ge=1, le=2)

    @model_validator(mode="after")
    def validate_environment(self) -> Self:
        hosts = [
            self.firebase_auth_emulator_host,
            self.firestore_emulator_host,
            self.firebase_storage_emulator_host,
        ]
        if self.app_env == "local":
            if not self.google_cloud_project.startswith("demo-"):
                raise ValueError("Local mode requires an isolated demo- Firebase project")
            if not all(hosts[:2]) or any(h and not is_loopback_host_port(h) for h in hosts):
                raise ValueError(
                    "Local mode requires explicit loopback Auth and Firestore emulators"
                )
            if self.app_check_required:
                raise ValueError("Isolated local emulators require APP_CHECK_REQUIRED=false")
        else:
            if self.google_cloud_project.startswith("demo-") or any(hosts):
                raise ValueError("Production cannot use a demo project or emulators")
            if not self.app_check_required or not self.app_check_app_ids:
                raise ValueError("Production requires App Check and an explicit app ID allowlist")
            if any(
                key.endswith(("_EMULATOR_HOST", "_EMULATOR_HOST_PATH")) and value
                for key, value in os.environ.items()
            ):
                raise ValueError("Production rejects emulator environment variables")
            if os.getenv("FIREBASE_APPCHECK_DEBUG_TOKEN"):
                raise ValueError("Production rejects App Check debug configuration")
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            raise ValueError("Use runtime identity or local emulators, not credential files")
        for origin in self.allowed_origins:
            parsed = urlsplit(origin)
            if (
                parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or not parsed.netloc
            ):
                raise ValueError("CORS origins must be explicit origins without paths")
            if self.app_env == "production" and parsed.scheme != "https":
                raise ValueError("Production origins must use HTTPS")
            if self.app_env == "local" and (
                parsed.scheme != "http" or not is_loopback_host_port(parsed.netloc)
            ):
                raise ValueError("Local origins must use HTTP on loopback hosts")
        return self

    def configure_emulator_environment(self) -> None:
        """Only validated local settings may enable unsigned emulator-token handling in the SDK."""
        if self.app_env == "local":
            os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = self.firebase_auth_emulator_host or ""
            os.environ["FIRESTORE_EMULATOR_HOST"] = self.firestore_emulator_host or ""
