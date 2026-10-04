"""Owner-scoped Firestore storage with atomic visitor limits."""

from random import uniform
from time import sleep

from google.api_core.exceptions import Aborted, GoogleAPICallError, RetryError
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore

from app.config import Settings
from app.errors import ApiError
from app.models.cases import CaseRead


def unavailable(error: Exception) -> ApiError:
    return ApiError(
        503, "STORAGE_UNAVAILABLE", "Case storage is unavailable. Retry shortly.", retryable=True
    )


class FirestoreCaseRepository:
    def __init__(self, settings: Settings):
        settings.configure_emulator_environment()
        self.client = firestore.Client(
            project=settings.google_cloud_project,
            credentials=AnonymousCredentials() if settings.app_env == "local" else None,
        )

    def create(self, owner_uid: str, case: CaseRead, maximum_cases: int) -> CaseRead:
        user_ref = self.client.collection("users").document(owner_uid)
        case_ref = user_ref.collection("cases").document(case.id)
        data = case.model_dump(mode="json")
        data.update(created_at=case.created_at, updated_at=case.updated_at)

        @firestore.transactional
        def reserve_and_create(transaction):
            snapshot = user_ref.get(transaction=transaction, timeout=5)
            user = snapshot.to_dict() or {}
            count = user.get("case_count", 0)
            if type(count) is not int or count < 0:
                raise ApiError(503, "STORAGE_INVALID_STATE", "Case storage needs attention.")
            if count >= maximum_cases:
                raise ApiError(429, "CASE_LIMIT_REACHED", "This demo session can hold two cases.")
            transaction.set(
                user_ref,
                {
                    "identity_type": "anonymous",
                    "case_count": count + 1,
                    "created_at": user.get("created_at", case.created_at),
                    "last_seen_at": case.created_at,
                },
                merge=True,
            )
            transaction.create(case_ref, data)

        # The SDK retries aborted commits and wraps exhaustion in ValueError with an
        # Aborted cause. One fresh transaction after jitter releases the old contention
        # slot. Never retry an ambiguous timeout: only an explicitly aborted transaction.
        for restart in range(2):
            try:
                reserve_and_create(self.client.transaction(max_attempts=5))
                return case
            except (Aborted, ValueError) as error:
                if isinstance(error, ValueError) and not isinstance(error.__cause__, Aborted):
                    raise
                if restart == 1:
                    raise ApiError(
                        503,
                        "STORAGE_CONTENTION",
                        "Another save is in progress. Retry shortly.",
                        retryable=True,
                    ) from error
                sleep(uniform(0.05, 0.15))
            except (GoogleAPICallError, RetryError) as error:
                raise unavailable(error) from error
        raise AssertionError("Bounded transaction loop must return or raise")

    def list_for_owner(self, owner_uid: str) -> list[CaseRead]:
        try:
            snapshots = (
                self.client.collection("users")
                .document(owner_uid)
                .collection("cases")
                .order_by("updated_at", direction=firestore.Query.DESCENDING)
                .limit(2)
                .stream(timeout=5)
            )
            return [CaseRead.model_validate(snapshot.to_dict()) for snapshot in snapshots]
        except (GoogleAPICallError, RetryError) as error:
            raise unavailable(error) from error

    def get(self, owner_uid: str, case_id: str) -> CaseRead | None:
        try:
            snapshot = (
                self.client.collection("users")
                .document(owner_uid)
                .collection("cases")
                .document(case_id)
                .get(timeout=5)
            )
            return CaseRead.model_validate(snapshot.to_dict()) if snapshot.exists else None
        except (GoogleAPICallError, RetryError) as error:
            raise unavailable(error) from error

    def close(self) -> None:
        self.client.close()
