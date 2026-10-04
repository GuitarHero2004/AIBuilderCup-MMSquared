"""Firebase verification is the only runtime source of owner identity."""

import re
from dataclasses import dataclass
from typing import Protocol
from uuid import uuid4

import firebase_admin
from firebase_admin import app_check, auth, credentials
from firebase_admin.exceptions import FirebaseError
from google.auth.credentials import AnonymousCredentials

from app.config import Settings
from app.errors import ApiError


@dataclass(frozen=True)
class Principal:
    uid: str

    def __post_init__(self):
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", self.uid):
            raise ApiError(401, "INVALID_IDENTITY", "Sign in again to continue.")


class IdentityVerifier(Protocol):
    def verify(self, id_token: str, app_check_token: str | None) -> Principal: ...


class _EmulatorCredential(credentials.Base):
    def get_credential(self):
        return AnonymousCredentials()


class FirebaseIdentityVerifier:
    def __init__(self, settings: Settings):
        settings.configure_emulator_environment()
        self.settings = settings
        credential = (
            _EmulatorCredential()
            if settings.app_env == "local"
            else credentials.ApplicationDefault()
        )
        self.app = firebase_admin.initialize_app(
            credential, {"projectId": settings.google_cloud_project}, name=f"api-{uuid4().hex}"
        )

    def verify(self, id_token: str, app_check_token: str | None) -> Principal:
        # SDK emulator handling is process-wide. Recheck before each use, not only startup.
        try:
            self.settings.validate_environment()
        except ValueError as error:
            raise ApiError(
                503, "INVALID_CONFIGURATION", "Identity verification is unavailable."
            ) from error
        try:
            claims = auth.verify_id_token(id_token, app=self.app, check_revoked=True)
        except auth.CertificateFetchError as error:
            raise ApiError(
                503,
                "AUTH_UNAVAILABLE",
                "Identity verification is unavailable. Retry shortly.",
                retryable=True,
            ) from error
        except FirebaseError as error:
            if error.code in {"UNAVAILABLE", "INTERNAL", "DEADLINE_EXCEEDED"}:
                raise ApiError(
                    503,
                    "AUTH_UNAVAILABLE",
                    "Identity verification is unavailable. Retry shortly.",
                    retryable=True,
                ) from error
            raise ApiError(
                401, "INVALID_IDENTITY", "Your session is invalid. Sign in again."
            ) from error
        except ValueError as error:
            raise ApiError(
                401, "INVALID_IDENTITY", "Your session is invalid. Sign in again."
            ) from error
        if claims.get("firebase", {}).get("sign_in_provider") != "anonymous":
            raise ApiError(403, "UNSUPPORTED_IDENTITY", "This demo requires an anonymous session.")
        if self.settings.app_check_required:
            if not app_check_token:
                raise ApiError(
                    403, "APP_CHECK_REQUIRED", "App verification is required. Reload and retry."
                )
            try:
                attestation = app_check.verify_token(app_check_token, app=self.app)
                if attestation.get("app_id") not in self.settings.app_check_app_ids:
                    raise ValueError("App is not allowed")
            except FirebaseError as error:
                if error.code in {"UNAVAILABLE", "INTERNAL", "DEADLINE_EXCEEDED"}:
                    raise ApiError(
                        503,
                        "APP_CHECK_UNAVAILABLE",
                        "App verification is unavailable. Retry shortly.",
                        retryable=True,
                    ) from error
                raise ApiError(
                    403, "INVALID_APP_CHECK", "App verification failed. Reload and retry."
                ) from error
            except ValueError as error:
                raise ApiError(
                    403, "INVALID_APP_CHECK", "App verification failed. Reload and retry."
                ) from error
        return Principal(uid=claims.get("uid", ""))

    def close(self) -> None:
        firebase_admin.delete_app(self.app)
