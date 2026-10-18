"""Bounded owner-only snapshots and shared AI reservations, including empty workspaces."""

import json
from random import uniform
from time import sleep

from google.api_core.exceptions import Aborted, GoogleAPICallError, RetryError
from google.cloud import firestore

from app.errors import ApiError
from app.models.cases import valid_case_id
from app.services.assistant_context import source_digest


class FirestoreWorkspaceRepository:
    def __init__(self, client):
        self.client = client

    @staticmethod
    def unavailable():
        return ApiError(503, "ASSISTANT_STATE_UNAVAILABLE", "Saved workspace state is unavailable.")

    def _ref(self, uid, path):
        if path == "@user":
            return self.client.document(f"users/{uid}")
        if path.startswith("@system/"):
            return self.client.document(path[8:])
        return self.client.document(f"users/{uid}/{path}")

    def atomic(self, uid, paths, work):
        refs = {alias: self._ref(uid, path) for alias, path in paths.items()}

        @firestore.transactional
        def execute(transaction):
            docs = {
                alias: ref.get(transaction=transaction, timeout=5).to_dict()
                for alias, ref in refs.items()
            }
            result, writes = work(docs)
            for alias, value in writes.items():
                if len(json.dumps(value, default=str).encode()) > 100000:
                    raise self.unavailable()
                transaction.set(refs[alias], value)
            return result

        for attempt in range(2):
            try:
                return execute(self.client.transaction(max_attempts=5))
            except (Aborted, ValueError) as error:
                if isinstance(error, ValueError) and not isinstance(error.__cause__, Aborted):
                    raise
                if attempt:
                    raise self.unavailable() from error
                sleep(uniform(0.05, 0.15))
            except (GoogleAPICallError, RetryError) as error:
                raise self.unavailable() from error
        raise AssertionError("Bounded transaction must return or raise")

    def read(self, uid, paths):
        return self.atomic(uid, paths, lambda docs: (docs, {}))

    def snapshot(self, uid, maximum_cases, maximum_quotes):
        """Query only this verified owner's collection and read all bounded statuses atomically."""
        user = self._ref(uid, "@user")

        @firestore.transactional
        def execute(transaction):
            paths, hashes = {}, {}

            def read(ref, path):
                value = ref.get(transaction=transaction, timeout=5).to_dict()
                alias = f"source_{len(paths)}"
                paths[alias], hashes[alias] = path, source_digest(value)
                return value

            read(user, "@user")
            snapshots = list(
                user.collection("cases")
                .limit(maximum_cases + 1)
                .stream(transaction=transaction, timeout=5)
            )
            if len(snapshots) > maximum_cases:
                raise self.unavailable()
            cases = []
            for snapshot in sorted(snapshots, key=lambda item: item.id):
                if not valid_case_id(snapshot.id):
                    raise self.unavailable()
                path = f"cases/{snapshot.id}"
                case = read(snapshot.reference, path)
                if not case or case.get("id") != snapshot.id:
                    raise self.unavailable()
                index = read(
                    snapshot.reference.collection("intake_state").document("index"),
                    f"{path}/intake_state/index",
                )
                ids = (index or {}).get("quote_ids", [])
                self._ids(ids, maximum_quotes)
                quotes = []
                for quote_id in ids:
                    quote = read(
                        snapshot.reference.collection("quotes").document(quote_id),
                        f"{path}/quotes/{quote_id}",
                    )
                    if not quote or quote.get("id") != quote_id:
                        raise self.unavailable()
                    quotes.append(quote)
                selections = read(
                    snapshot.reference.collection("selection_state").document("index"),
                    f"{path}/selection_state/index",
                )
                selection_ids = (selections or {}).get("selection_ids", [])
                self._ids(selection_ids, 20)
                cases.append({"case": case, "quotes": quotes, "selection_ids": selection_ids})
            return cases, {"paths": paths, "hashes": hashes}

        try:
            return execute(self.client.transaction(max_attempts=5))
        except (GoogleAPICallError, RetryError) as error:
            raise self.unavailable() from error
        except ValueError as error:
            if isinstance(error.__cause__, Aborted):
                raise self.unavailable() from error
            raise

    @staticmethod
    def _ids(ids, maximum):
        if (
            not isinstance(ids, list)
            or len(ids) > maximum
            or any(not isinstance(i, str) or not valid_case_id(i) for i in ids)
            or len(ids) != len(set(ids))
        ):
            raise FirestoreWorkspaceRepository.unavailable()
