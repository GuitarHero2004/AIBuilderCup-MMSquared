"""Scoped document transactions for quotation state, receipts and shared run limits."""

import json
from collections.abc import Callable
from random import uniform
from time import sleep
from typing import Any

from google.api_core.exceptions import Aborted, GoogleAPICallError, RetryError
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore

from app.config import Settings
from app.errors import ApiError
from app.models.cases import valid_case_id

Documents = dict[str, dict | None]
TransactionWork = Callable[[Documents], tuple[Any, dict[str, dict]]]


class FirestoreQuotationRepository:
    def __init__(self, settings: Settings):
        settings.configure_emulator_environment()
        self.client = firestore.Client(
            project=settings.google_cloud_project,
            credentials=AnonymousCredentials() if settings.app_env == "local" else None,
        )

    def _refs(self, uid: str, case_id: str, paths: dict[str, str]):
        if not valid_case_id(case_id):
            raise ApiError(404, "CASE_NOT_FOUND", "This case is not available in your session.")
        user = self.client.collection("users").document(uid)
        case = user.collection("cases").document(case_id)
        refs = {"case": case}
        for alias, path in paths.items():
            if path.startswith("@user/"):
                refs[alias] = self.client.document(f"{user.path}/{path[6:]}")
            elif path.startswith("@system/"):
                refs[alias] = self.client.document(path[8:])
            else:
                refs[alias] = self.client.document(f"{case.path}/{path}")
        return refs

    @staticmethod
    def _require_case(docs: Documents) -> None:
        if docs["case"] is None:
            raise ApiError(404, "CASE_NOT_FOUND", "This case is not available in your session.")

    def read(self, uid: str, case_id: str, paths: dict[str, str]) -> Documents:
        refs = self._refs(uid, case_id, paths)
        try:
            # Read the owner-scoped case first, before any quota/system document.
            case = refs["case"].get(timeout=5)
            docs = {"case": case.to_dict() if case.exists else None}
            self._require_case(docs)
            for alias, ref in refs.items():
                if alias != "case":
                    snapshot = ref.get(timeout=5)
                    docs[alias] = snapshot.to_dict() if snapshot.exists else None
            return docs
        except (GoogleAPICallError, RetryError) as error:
            raise self._unavailable() from error

    def atomic(self, uid: str, case_id: str, paths: dict[str, str], work: TransactionWork):
        refs = self._refs(uid, case_id, paths)

        @firestore.transactional
        def execute(transaction):
            docs = {}
            for alias, ref in refs.items():
                snapshot = ref.get(transaction=transaction, timeout=5)
                docs[alias] = snapshot.to_dict() if snapshot.exists else None
                if alias == "case":
                    self._require_case(docs)
            result, writes = work(docs)
            for value in writes.values():
                if len(json.dumps(value, ensure_ascii=False, default=str).encode()) > 600_000:
                    raise ApiError(
                        422,
                        "REVIEW_SIZE_LIMIT",
                        "The saved review is too large. Shorten notes and quoted excerpts.",
                    )
            for alias, value in writes.items():
                transaction.set(refs[alias], value)
            return result

        # A new transaction plus jitter releases an exhausted contention slot. Retry only
        # an explicit abort, never an ambiguous timeout whose commit result is unknown.
        for restart in range(2):
            try:
                return execute(self.client.transaction(max_attempts=5))
            except (Aborted, ValueError) as error:
                if isinstance(error, ValueError) and not isinstance(error.__cause__, Aborted):
                    raise
                if restart == 1:
                    raise self._unavailable() from error
                sleep(uniform(0.05, 0.25))
            except (GoogleAPICallError, RetryError) as error:
                raise self._unavailable() from error
        raise AssertionError("Bounded transaction retries must return or raise")

    @staticmethod
    def _unavailable() -> ApiError:
        return ApiError(
            503,
            "STORAGE_UNAVAILABLE",
            "Saved quotation state is temporarily unavailable.",
            retryable=True,
        )

    def close(self):
        self.client.close()
