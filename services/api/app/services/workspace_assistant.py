"""Luma reads the whole owner workspace and proposes safe, explicit navigation."""

import asyncio
from datetime import timedelta
from uuid import uuid4

from pydantic import ValidationError

from app.errors import ApiError
from app.models.workspace_assistant import (
    WorkspaceAssistantAction,
    WorkspaceAssistantCase,
    WorkspaceAssistantSnapshot,
    WorkspaceNavigationChoice,
    WorkspaceNavigationResult,
)
from app.services.assistant import AssistantService
from app.services.assistant_context import source_digest
from app.services.quotations import digest, now


class WorkspaceAssistantService:
    def __init__(self, repo, settings, provider):
        self.repo, self.settings, self.provider = repo, settings, provider

    def _snapshot(self, principal):
        records, guards = self.repo.snapshot(
            principal.uid,
            self.settings.maximum_cases_per_user,
            self.settings.maximum_quotes_per_case,
        )
        actions = [
            WorkspaceAssistantAction(
                id="workspace", kind="open_workspace", label="Open sourcing cases"
            ),
            WorkspaceAssistantAction(id="help", kind="open_help", label="Open workspace guide"),
        ]
        if len(records) < self.settings.maximum_cases_per_user:
            actions.append(
                WorkspaceAssistantAction(
                    id="create", kind="create_case", label="Create a sourcing case"
                )
            )
        cases = []
        try:
            for record in records:
                case, quotes = record["case"], record["quotes"]
                item = WorkspaceAssistantCase(
                    id=case["id"],
                    name=case["name"],
                    data_revision=case["data_revision"],
                    quotation_count=len(quotes),
                    confirmed_count=sum(q["status"] == "confirmed" for q in quotes),
                    selection_count=len(record["selection_ids"]),
                )
                cases.append(item)
                for kind, label in (
                    ("open_case", "Open requirements"),
                    ("open_intake", "Open quotations"),
                    ("open_comparison", "Open comparison"),
                    ("open_history", "Open saved selections"),
                ):
                    if kind == "open_history" and not item.selection_count:
                        continue
                    actions.append(
                        WorkspaceAssistantAction(
                            id=f"{kind}:{item.id}",
                            kind=kind,
                            label=f"{label}: {item.name}",
                            case_id=item.id,
                            expected_case_revision=item.data_revision,
                        )
                    )
            return WorkspaceAssistantSnapshot(
                workspace_fingerprint=digest(guards["hashes"]), cases=cases, actions=actions
            ), guards
        except (KeyError, TypeError, ValidationError) as error:
            raise self.unavailable() from error

    def workspace(self, principal):
        return self._snapshot(principal)[0]

    @staticmethod
    def unavailable():
        return ApiError(503, "ASSISTANT_STATE_UNAVAILABLE", "Saved workspace state is unavailable.")

    @staticmethod
    def _path(key):
        return AssistantService._key(key).replace("assistant_operations/", "navigation_operations/")

    @staticmethod
    def _public(raw):
        if not raw:
            raise ApiError(
                404, "ASSISTANT_OPERATION_NOT_FOUND", "No navigation request is recorded."
            )
        try:
            return WorkspaceNavigationResult.model_validate(
                {
                    key: value
                    for key, value in raw.items()
                    if key in WorkspaceNavigationResult.model_fields
                }
            )
        except (ValidationError, TypeError) as error:
            raise WorkspaceAssistantService.unavailable() from error

    def _raw(self, principal, key):
        raw = self.repo.read(principal.uid, {"op": self._path(key)})["op"]
        self._public(raw)
        return raw

    @staticmethod
    def _guard_sources(docs, guards):
        if any(source_digest(docs[key]) != value for key, value in guards["hashes"].items()):
            raise ApiError(
                409, "WORKSPACE_CHANGED", "Saved workspace data changed. Refresh and ask again."
            )

    @staticmethod
    def _live(docs):
        op = docs["op"]
        if not op or op["status"] != "running":
            raise ApiError(
                409, "ASSISTANT_CANCELLED", "This navigation request is no longer active."
            )
        if now() >= op["deadline_at"]:
            raise ApiError(504, "RUN_TIMEOUT", "Luma reached this request's time limit.")
        if (docs.get("control") or {}).get("ai_disabled", False):
            raise ApiError(503, "AI_DISABLED", "AI requests are temporarily paused.")
        if not docs["active"] or docs["active"].get("run_id") != op["run_id"]:
            raise ApiError(409, "RUN_INTERRUPTED", "The AI request lease changed.")
        return op

    def _start(self, principal, key, payload):
        path = self._path(key)
        fingerprint = digest(payload.model_dump(mode="json"))
        initial = self.repo.read(principal.uid, {"op": path})["op"]
        if initial:
            self._replay(initial, fingerprint)
            return initial, False
        if not self.settings.ai_enabled or not self.provider or not self.provider.enabled:
            raise ApiError(503, "AI_DISABLED", "Luma is not enabled in this environment.")
        snapshot, guards = self._snapshot(principal)
        if snapshot.workspace_fingerprint != payload.expected_workspace_fingerprint:
            raise ApiError(
                409, "WORKSPACE_CHANGED", "Refresh Luma's workspace context before asking."
            )
        stamp, run_id = now(), uuid4().hex
        paths = {
            "op": path,
            "active": "limits/active",
            "global_active": "@system/system_limits/active",
            "control": "@system/system_limits/control",
            **guards["paths"],
        }

        def start(docs):
            if docs["op"]:
                self._replay(docs["op"], fingerprint)
                return (docs["op"], False), {}
            self._guard_sources(docs, guards)
            if (docs["control"] or {}).get("ai_disabled", False):
                raise ApiError(503, "AI_DISABLED", "AI requests are temporarily paused.")
            if docs["active"] and docs["active"].get("expires_at", stamp) > stamp:
                raise ApiError(
                    409, "ACTIVE_RUN_EXISTS", "Another AI request is active in this session."
                )
            leases = (docs["global_active"] or {}).get("leases", {})
            if not isinstance(leases, dict):
                raise self.unavailable()
            leases = {key: expiry for key, expiry in leases.items() if expiry > stamp}
            if len(leases) >= self.settings.maximum_active_extractions_global:
                raise ApiError(
                    429,
                    "RUN_CAPACITY_REACHED",
                    "AI capacity is busy. Try again shortly.",
                    retryable=True,
                )
            op = WorkspaceNavigationResult(
                request_key=key,
                status="running",
                workspace_fingerprint=snapshot.workspace_fingerprint,
            ).model_dump(mode="json")
            op.update(
                run_id=run_id,
                model_id=self.settings.gemini_model or "unconfigured",
                prompt_version=getattr(
                    self.provider, "prompt_version", "workspace_navigation_adk_v1"
                ),
                request_hash=fingerprint,
                started_at=stamp,
                deadline_at=stamp + timedelta(seconds=60),
                expires_at=stamp + timedelta(seconds=90),
                guards=guards,
                context=snapshot.model_dump(mode="json"),
                tool_count=0,
                read_completed=False,
            )
            leases[run_id] = op["expires_at"]
            return (op, True), {
                "op": op,
                "active": {
                    "run_id": run_id,
                    "expires_at": op["expires_at"],
                    "kind": "workspace_navigation",
                },
                "global_active": {"leases": leases},
            }

        return self.repo.atomic(principal.uid, paths, start)

    @staticmethod
    def _replay(raw, fingerprint):
        if raw.get("cancelled_before_start"):
            raise ApiError(
                409, "OPERATION_CANCELLED", "This navigation request was closed before starting."
            )
        if raw.get("request_hash") != fingerprint:
            raise ApiError(
                409, "IDEMPOTENCY_CONFLICT", "This key belongs to another navigation request."
            )

    def _record(self, principal, key, kind):
        raw = self._raw(principal, key)
        guards = raw["guards"]
        period = now().strftime("%Y-%m-%d")
        paths = {
            "op": self._path(key),
            "active": "limits/active",
            "control": "@system/system_limits/control",
            "user_limit": f"limits/{period}",
            "global_limit": f"@system/system_limits/{period}",
            **guards["paths"],
        }

        def record(docs):
            op = self._live(docs)
            self._guard_sources(docs, guards)
            writes = {}
            if kind == "model":
                if op["model_call_count"] >= 3:
                    raise ApiError(
                        429, "ASSISTANT_BUDGET_EXCEEDED", "Luma reached its request limit."
                    )
                used = [
                    (docs[alias] or {}).get("generations_reserved", 0)
                    for alias in ("user_limit", "global_limit")
                ]
                if any(type(value) is not int or value < 0 for value in used):
                    raise self.unavailable()
                if (
                    used[0] >= self.settings.maximum_generations_per_user_day
                    or used[1] >= self.settings.maximum_generations_global_day
                ):
                    raise ApiError(429, "RUN_QUOTA_EXCEEDED", "The daily AI allowance is used.")
                for alias, count in zip(("user_limit", "global_limit"), used, strict=True):
                    writes[alias] = {**(docs[alias] or {}), "generations_reserved": count + 1}
                op["model_call_count"] += 1
            elif kind == "read":
                if op["tool_count"] >= 2:
                    raise ApiError(429, "ASSISTANT_BUDGET_EXCEEDED", "Luma reached its read limit.")
                op["tool_count"] += 1
                op["read_completed"] = True
            else:
                raise ApiError(403, "ASSISTANT_TOOL_DENIED", "This tool is not allowed.")
            writes["op"] = op
            return op["context"], writes

        return self.repo.atomic(principal.uid, paths, record)

    def _finish(self, principal, key, choice=None, failure=None, status="failed"):
        raw = self._raw(principal, key)
        guards = raw.get("guards", {"paths": {}, "hashes": {}})
        paths = {
            "op": self._path(key),
            "active": "limits/active",
            "global_active": "@system/system_limits/active",
            "control": "@system/system_limits/control",
            **guards["paths"],
        }

        def finish(docs):
            op = docs["op"]
            if op["status"] != "running":
                return self._public(op), {}
            error, terminal = failure, status
            if choice is not None:
                try:
                    self._live(docs)
                    self._guard_sources(docs, guards)
                    if not op["read_completed"] or op["model_call_count"] < 2:
                        raise ApiError(
                            502,
                            "INVALID_ASSISTANT_RESULT",
                            "Luma did not read the saved workspace.",
                        )
                    available = {a["id"]: a for a in op["context"]["actions"]}
                    if len(set(choice.action_ids)) != len(choice.action_ids) or any(
                        i not in available for i in choice.action_ids
                    ):
                        raise ApiError(
                            502,
                            "INVALID_ASSISTANT_RESULT",
                            "Luma returned an unavailable destination.",
                        )
                    op["actions"] = [available[i] for i in choice.action_ids]
                    summaries = {
                        "navigation": (
                            "Here are the destinations in your saved workspace. "
                            "Choose one to continue."
                        ),
                        "next_step": (
                            "Use these next steps for your saved cases. "
                            "Review and confirmation remain yours."
                        ),
                        "guide": (
                            "The workspace guide explains requirements, quotations, "
                            "review, comparison and saved selections."
                        ),
                        "limitations": (
                            "I can navigate your private saved workspace and explain "
                            "saved records. I cannot approve purchases, confirm "
                            "quotations or access other users' workspaces."
                        ),
                    }
                    op["summary"] = summaries[choice.focus]
                    terminal = "succeeded"
                    op["is_current"] = True
                except ApiError as issue:
                    error = issue
            op.update(status=terminal, completed_at=now())
            if error:
                op["error"] = {
                    "code": error.code,
                    "message": error.message,
                    "retryable": error.retryable,
                }
                op["actions"] = []
                op["summary"] = None
                op["is_current"] = False if error.code == "WORKSPACE_CHANGED" else None
            leases = (docs["global_active"] or {}).get("leases", {})
            leases.pop(op["run_id"], None)
            writes = {"op": op, "global_active": {"leases": leases}}
            if docs["active"] and docs["active"].get("run_id") == op["run_id"]:
                writes["active"] = {**docs["active"], "expires_at": now()}
            return self._public(op), writes

        return self.repo.atomic(principal.uid, paths, finish)

    async def navigate(self, principal, key, payload, disconnected=None):
        raw, fresh = await asyncio.to_thread(self._start, principal, key, payload)
        if not fresh:
            return await asyncio.to_thread(self.operation, principal, key)
        work = None
        try:
            async with asyncio.timeout(max(0, (raw["deadline_at"] - now()).total_seconds())):
                hooks = WorkspaceHooks(self, principal, key)
                work = asyncio.create_task(
                    self.provider.navigate(raw["context"], payload.message, payload.screen, hooks)
                )
                while not work.done():
                    await asyncio.wait({work}, timeout=0.5)
                    if disconnected and await disconnected():
                        raise ApiError(
                            499,
                            "CLIENT_DISCONNECTED",
                            "The navigation request ended before completion.",
                        )
                    current = await asyncio.to_thread(self._raw, principal, key)
                    if current["status"] != "running":
                        work.cancel()
                        await asyncio.gather(work, return_exceptions=True)
                        return self._public(current)
                choice = WorkspaceNavigationChoice.model_validate(await work)
                return await asyncio.to_thread(self._finish, principal, key, choice)
        except (Exception, asyncio.CancelledError) as error:
            if work and not work.done():
                work.cancel()
                await asyncio.gather(work, return_exceptions=True)
            failure = (
                error
                if isinstance(error, ApiError)
                else ApiError(
                    504 if isinstance(error, TimeoutError) else 502,
                    "RUN_TIMEOUT" if isinstance(error, TimeoutError) else "ASSISTANT_UNAVAILABLE",
                    "Luma did not finish. Check the recorded result before retrying.",
                    retryable=True,
                )
            )
            status = (
                "timed_out"
                if failure.code == "RUN_TIMEOUT"
                else "interrupted"
                if failure.code == "CLIENT_DISCONNECTED"
                or isinstance(error, asyncio.CancelledError)
                else "failed"
            )
            return await asyncio.shield(
                asyncio.to_thread(self._finish, principal, key, None, failure, status)
            )

    def operation(self, principal, key):
        raw = self._raw(principal, key)
        if raw["status"] == "running" and now() >= raw["expires_at"]:
            return self._finish(
                principal,
                key,
                failure=ApiError(
                    503, "RUN_INTERRUPTED", "The navigation request expired without a saved answer."
                ),
                status="interrupted",
            )
        result = self._public(raw)
        if result.status == "succeeded":
            result.is_current = (
                self.workspace(principal).workspace_fingerprint == result.workspace_fingerprint
            )
        return result

    def cancel(self, principal, key):
        path = self._path(key)

        # The operation is itself the cancellation fence, even if a delayed POST has not arrived.
        def fence(docs):
            if docs["op"]:
                return False, {}
            raw = WorkspaceNavigationResult(
                request_key=key, status="cancelled", workspace_fingerprint="0" * 64
            ).model_dump(mode="json")
            raw["cancelled_before_start"] = True
            return True, {"op": raw}

        fresh = self.repo.atomic(principal.uid, {"op": path}, fence)
        if fresh:
            return self.operation(principal, key)
        return self._finish(
            principal,
            key,
            failure=ApiError(409, "ASSISTANT_CANCELLED", "This navigation request was cancelled."),
            status="cancelled",
        )


class WorkspaceHooks:
    def __init__(self, service, principal, key):
        self.service, self.principal, self.key = service, principal, key

    async def before_model(self):
        return await asyncio.to_thread(self.service._record, self.principal, self.key, "model")

    async def read_context(self):
        return await asyncio.to_thread(self.service._record, self.principal, self.key, "read")
