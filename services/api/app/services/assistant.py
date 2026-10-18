"""Durable bounded assistant runs sharing extraction quotas; no business-write tools."""

import asyncio
import re
from datetime import timedelta
from uuid import uuid4

from pydantic import ValidationError

from app.errors import ApiError
from app.models.assistant import (
    AssistantCancellation,
    AssistantEvent,
    AssistantEvents,
    AssistantNarrative,
    AssistantRequest,
    AssistantRun,
    AssistantRunList,
)
from app.services.assistant_context import build_context, render_result, source_digest
from app.services.quotations import digest, key_path, now, require_id

AGENTS = {"coordinator", "quotation_specialist", "sourcing_specialist"}
MAX_MODELS, MAX_TOOLS, MAX_DELEGATIONS = 6, 8, 2


def unavailable():
    return ApiError(
        503, "ASSISTANT_STATE_UNAVAILABLE", "Saved assistant state could not be verified."
    )


class AssistantService:
    def __init__(self, repo, settings, provider):
        self.repo, self.settings, self.provider = repo, settings, provider

    @staticmethod
    def _key(key):
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", key):
            raise ApiError(422, "INVALID_INPUT", "Use a valid operation key.")
        return f"assistant_operations/{key_path(key)}"

    @staticmethod
    def _public(raw, case_id, run_id, case_revision=None):
        if raw is None:
            raise ApiError(404, "ASSISTANT_RUN_NOT_FOUND", "This assistant run is not available.")
        try:
            run = AssistantRun.model_validate(
                {k: v for k, v in raw.items() if k in AssistantRun.model_fields}
            )
        except (ValidationError, TypeError) as error:
            raise unavailable() from error
        if run.case_id != case_id or run.id != run_id:
            raise unavailable()
        if case_revision is not None:
            run.is_current = case_revision == run.expected_case_revision
        return run

    def _context(self, principal, case_id, payload):
        try:
            return build_context(
                self.repo, principal, case_id, payload, self.settings.maximum_quotes_per_case
            )
        except (ValidationError, KeyError, TypeError) as error:
            raise unavailable() from error

    def _start(self, principal, case_id, key, payload):
        op_path = self._key(key)
        request_hash = digest(payload.model_dump(mode="json"))
        existing = self.repo.read(principal.uid, case_id, {"op": op_path})["op"]
        if existing:
            self._replay(existing, request_hash)
            return self.get(principal, case_id, existing["run_id"]), False
        if not self.settings.ai_enabled or not self.provider or not self.provider.enabled:
            raise ApiError(503, "AI_DISABLED", "The assistant is not enabled in this environment.")
        context = self._context(principal, case_id, payload)
        # A previous turn is owner/case scoped and read from Firestore, never client chat text.
        history = self._history(principal, case_id, payload, context["source_fingerprint"])
        stamp, run_id = now(), uuid4().hex
        paths = {
            "op": op_path,
            "run": f"assistant_runs/{run_id}",
            "index": "assistant_state/index",
            "active": "@user/limits/active",
            "global_active": "@system/system_limits/active",
            "control": "@system/system_limits/control",
        }

        def start(docs):
            if docs["op"]:
                self._replay(docs["op"], request_hash)
                return (docs["op"]["run_id"], False), {}
            if docs["case"]["data_revision"] != payload.expected_case_revision:
                raise ApiError(
                    409, "STALE_CASE_REVISION", "The case changed. Refresh before asking."
                )
            if (docs["control"] or {}).get("ai_disabled", False):
                raise ApiError(503, "AI_DISABLED", "AI requests are temporarily paused.")
            if docs["active"] and docs["active"].get("expires_at", stamp) > stamp:
                raise ApiError(
                    409, "ACTIVE_RUN_EXISTS", "Another AI request is active in this session."
                )
            leases = (docs["global_active"] or {}).get("leases", {})
            if not isinstance(leases, dict):
                raise unavailable()
            leases = {k: expiry for k, expiry in leases.items() if expiry > stamp}
            if len(leases) >= self.settings.maximum_active_extractions_global:
                raise ApiError(
                    429,
                    "RUN_CAPACITY_REACHED",
                    "AI capacity is busy. Try again shortly.",
                    retryable=True,
                )
            ids = self._ids(docs["index"])
            run = AssistantRun(
                id=run_id,
                case_id=case_id,
                request_key=key,
                intent=payload.intent,
                screen=payload.screen,
                message=payload.message,
                status="running",
                expected_case_revision=payload.expected_case_revision,
                expected_draft_revision=payload.expected_draft_revision,
                quote_id=payload.quote_id,
                selection_id=payload.selection_id,
                source_fingerprint=context["source_fingerprint"],
                has_unsaved_changes=payload.has_unsaved_changes,
                started_at=stamp,
                model_id=self.settings.gemini_model or "unconfigured",
                prompt_version=self.provider.prompt_version,
            ).model_dump(mode="json")
            run.update(
                started_at=stamp,
                deadline_at=stamp + timedelta(seconds=120),
                expires_at=stamp + timedelta(seconds=150),
                payload=payload.model_dump(mode="json"),
                context=context,
                history=history,
                cancel_requested=False,
                delegation_count=0,
                events=[
                    AssistantEvent(
                        sequence=1,
                        event_type="run_started",
                        message="Assistant request recorded against saved case data.",
                        timestamp=stamp,
                    ).model_dump(mode="json")
                ],
            )
            leases[run_id] = run["expires_at"]
            return (run_id, True), {
                "op": {"request_hash": request_hash, "run_id": run_id},
                "run": run,
                "index": {"ids": [run_id, *ids][:20]},
                "active": {"run_id": run_id, "case_id": case_id, "expires_at": run["expires_at"]},
                "global_active": {"leases": leases},
            }

        result_id, fresh = self.repo.atomic(principal.uid, case_id, paths, start)
        return self.get(principal, case_id, result_id), fresh

    @staticmethod
    def _replay(op, fingerprint):
        if op.get("cancelled"):
            raise ApiError(
                409, "OPERATION_CANCELLED", "This assistant request was closed before starting."
            )
        if op.get("request_hash") != fingerprint:
            raise ApiError(
                409, "IDEMPOTENCY_CONFLICT", "This key belongs to a different assistant request."
            )

    @staticmethod
    def _ids(index):
        ids = (index or {}).get("ids", [])
        if (
            not isinstance(ids, list)
            or len(ids) > 20
            or any(not isinstance(i, str) or not re.fullmatch(r"[a-f0-9]{32}", i) for i in ids)
            or len(ids) != len(set(ids))
        ):
            raise unavailable()
        return ids

    def _history(self, principal, case_id, payload, fingerprint):
        previous = payload.previous_run_id
        history, seen = [], set()
        while previous and len(history) < 2:
            require_id(previous, "Assistant run")
            if previous in seen:
                raise unavailable()
            seen.add(previous)
            raw = self.repo.read(principal.uid, case_id, {"run": f"assistant_runs/{previous}"})[
                "run"
            ]
            parsed = self._public(raw, case_id, previous)
            if (
                parsed.status != "succeeded"
                or parsed.intent != payload.intent
                or parsed.expected_case_revision != payload.expected_case_revision
                or parsed.quote_id != payload.quote_id
                or parsed.expected_draft_revision != payload.expected_draft_revision
                or parsed.selection_id != payload.selection_id
                or parsed.source_fingerprint != fingerprint
            ):
                raise ApiError(
                    409,
                    "ASSISTANT_HISTORY_UNAVAILABLE",
                    "Choose a completed turn with the same saved record and revision.",
                )
            # Historical questions help continuity, but old metrics never become current grounding.
            history.append(
                {
                    "message": parsed.message,
                    "intent": parsed.intent,
                    "historical": True,
                    "summary": parsed.result.summary,
                }
            )
            previous = raw.get("payload", {}).get("previous_run_id")
        return list(reversed(history))

    def _raw(self, principal, case_id, run_id):
        docs = self.repo.read(principal.uid, case_id, {"run": f"assistant_runs/{run_id}"})
        self._public(docs["run"], case_id, run_id)
        return docs

    @staticmethod
    def _live(docs):
        run = docs["run"]
        if not run or run["status"] != "running":
            raise ApiError(409, "RUN_INTERRUPTED", "The assistant run is no longer active.")
        if run.get("cancel_requested"):
            raise ApiError(409, "ASSISTANT_CANCELLED", "The assistant request was cancelled.")
        if now() >= run["deadline_at"]:
            raise ApiError(504, "RUN_TIMEOUT", "The assistant reached its time limit.")
        if docs["case"]["data_revision"] != run["expected_case_revision"]:
            raise ApiError(409, "STALE_CASE_REVISION", "Saved inputs changed during this request.")
        if (docs.get("control") or {}).get("ai_disabled", False):
            raise ApiError(503, "AI_DISABLED", "AI requests are temporarily paused.")
        return run

    def _check(self, principal, case_id, run_id):
        docs = self._raw(principal, case_id, run_id)
        run = self._live(docs)
        context = self._context(principal, case_id, AssistantRequest.model_validate(run["payload"]))
        if context["source_fingerprint"] != run["source_fingerprint"]:
            raise ApiError(
                409, "ASSISTANT_INPUT_CHANGED", "Saved inputs changed. Ask again after refreshing."
            )
        return context

    def _record(self, principal, case_id, run_id, kind, agent=None, tool=None, guards=None):
        if agent is not None and agent not in AGENTS:
            raise ApiError(403, "ASSISTANT_TOOL_DENIED", "This agent is not permitted.")
        stamp = now()
        period = stamp.strftime("%Y-%m-%d")
        paths = {
            "run": f"assistant_runs/{run_id}",
            "control": "@system/system_limits/control",
            "active": "@user/limits/active",
            "user_limit": f"@user/limits/{period}",
            "global_limit": f"@system/system_limits/{period}",
        }

        if guards:
            paths.update(guards["paths"])

        def record(docs):
            run = self._live(docs)
            if guards and any(
                source_digest(docs[key]) != value for key, value in guards["hashes"].items()
            ):
                raise ApiError(
                    409, "ASSISTANT_INPUT_CHANGED", "Saved inputs changed before this step."
                )
            if not docs["active"] or docs["active"].get("run_id") != run_id:
                raise ApiError(409, "RUN_INTERRUPTED", "The assistant run lease changed.")
            writes = {}
            if kind == "model":
                if run["model_call_count"] >= MAX_MODELS:
                    raise ApiError(
                        429, "ASSISTANT_BUDGET_EXCEEDED", "This request reached its model limit."
                    )
                used = [
                    (docs[k] or {}).get("generations_reserved", 0)
                    for k in ("user_limit", "global_limit")
                ]
                if any(type(v) is not int or v < 0 for v in used):
                    raise unavailable()
                if (
                    used[0] >= self.settings.maximum_generations_per_user_day
                    or used[1] >= self.settings.maximum_generations_global_day
                ):
                    raise ApiError(429, "RUN_QUOTA_EXCEEDED", "The daily AI allowance is used.")
                run["model_call_count"] += 1
                for alias, count in zip(("user_limit", "global_limit"), used, strict=True):
                    writes[alias] = {**(docs[alias] or {}), "generations_reserved": count + 1}
            else:
                if kind == "tool_started":
                    expected = (
                        "quotation_specialist"
                        if run["intent"] == "quote_help"
                        else "sourcing_specialist"
                    )
                    if tool not in {expected, "read_saved_context"} or (agent == "coordinator") != (
                        tool == expected
                    ):
                        raise ApiError(
                            403, "ASSISTANT_TOOL_DENIED", "This tool is not permitted in this run."
                        )
                    if run["tool_call_count"] >= MAX_TOOLS:
                        raise ApiError(
                            429, "ASSISTANT_BUDGET_EXCEEDED", "The request reached its tool limit."
                        )
                    run["tool_call_count"] += 1
                    if tool == expected:
                        run["delegation_count"] += 1
                        if run["delegation_count"] > MAX_DELEGATIONS:
                            raise ApiError(
                                429,
                                "ASSISTANT_BUDGET_EXCEEDED",
                                "The delegation limit was reached.",
                            )
                if len(run["events"]) >= 78:
                    raise ApiError(
                        429, "ASSISTANT_BUDGET_EXCEEDED", "The activity limit was reached."
                    )
                message = {
                    "agent_started": "The agent started its bounded saved-state task.",
                    "tool_started": "The agent started an authorized read or specialist tool.",
                    "tool_completed": "The authorized tool returned its recorded result.",
                }[kind]
                run["events"].append(
                    AssistantEvent(
                        sequence=len(run["events"]) + 1,
                        event_type=kind,
                        agent_name=agent,
                        tool_name=tool,
                        message=message,
                        timestamp=stamp,
                    ).model_dump(mode="json")
                )
            writes["run"] = run
            return None, writes

        self.repo.atomic(principal.uid, case_id, paths, record)

    def _finish(self, principal, case_id, run_id, result=None, error=None, status="failed"):
        paths = {
            "run": f"assistant_runs/{run_id}",
            "active": "@user/limits/active",
            "global_active": "@system/system_limits/active",
        }
        guards = None
        if result is not None:
            saved = self._raw(principal, case_id, run_id)["run"]
            guards = saved["context"]["source_guards"]
            paths.update(guards["paths"])
        stamp = now()

        def finish(docs):
            run = docs["run"]
            self._public(run, case_id, run_id)
            if run["status"] != "running":
                return self._public(run, case_id, run_id, docs["case"]["data_revision"]), {}
            failure, terminal = error, status
            if run.get("cancel_requested"):
                failure = ApiError(
                    409, "ASSISTANT_CANCELLED", "The assistant request was cancelled."
                )
                terminal = "cancelled"
            elif result is not None and (
                stamp >= run["deadline_at"]
                or docs["case"]["data_revision"] != run["expected_case_revision"]
                or not docs["active"]
                or docs["active"].get("run_id") != run_id
                or any(source_digest(docs[key]) != value for key, value in guards["hashes"].items())
            ):
                failure = ApiError(
                    409, "ASSISTANT_INPUT_CHANGED", "Inputs changed before the answer was saved."
                )
            if result is not None and failure is None:
                terminal = "succeeded"
                run["result"] = result.model_dump(mode="json")
            run.update(status=terminal, completed_at=stamp)
            if failure:
                run["error"] = {
                    "code": failure.code,
                    "message": failure.message,
                    "retryable": failure.retryable,
                }
            run["events"].append(
                AssistantEvent(
                    sequence=len(run["events"]) + 1,
                    event_type="run_completed" if terminal == "succeeded" else "run_failed",
                    message="The grounded answer was saved."
                    if terminal == "succeeded"
                    else "The assistant stopped. Read the recorded result before retrying.",
                    timestamp=stamp,
                ).model_dump(mode="json")
            )
            leases = (docs["global_active"] or {}).get("leases", {})
            leases.pop(run_id, None)
            writes = {"run": run, "global_active": {"leases": leases}}
            if docs["active"] and docs["active"].get("run_id") == run_id:
                writes["active"] = {**docs["active"], "expires_at": stamp}
            return self._public(run, case_id, run_id, docs["case"]["data_revision"]), writes

        return self.repo.atomic(principal.uid, case_id, paths, finish)

    async def run(self, principal, case_id, key, payload, disconnected=None):
        run, fresh = await asyncio.to_thread(self._start, principal, case_id, key, payload)
        if not fresh:
            return run
        work = None
        try:
            async with asyncio.timeout(max(0, 120 - (now() - run.started_at).total_seconds())):
                raw = (await asyncio.to_thread(self._raw, principal, case_id, run.id))["run"]
                hooks = AssistantHooks(self, principal, case_id, run.id)
                work = asyncio.create_task(
                    self.provider.respond(raw["context"], payload.message, raw["history"], hooks)
                )
                while not work.done():
                    await asyncio.wait({work}, timeout=1.0)
                    if disconnected and await disconnected():
                        raise ApiError(
                            499, "CLIENT_DISCONNECTED", "The request ended before completion."
                        )
                    # Cross-replica cancellation checks do not consume model quota.
                    current = (await asyncio.to_thread(self._raw, principal, case_id, run.id))[
                        "run"
                    ]
                    if current.get("cancel_requested"):
                        raise ApiError(
                            409, "ASSISTANT_CANCELLED", "The assistant request was cancelled."
                        )
                narrative = AssistantNarrative.model_validate(await work)
                completed = (await asyncio.to_thread(self._raw, principal, case_id, run.id))["run"]
                specialist = (
                    "quotation_specialist"
                    if payload.intent == "quote_help"
                    else "sourcing_specialist"
                )
                if not (
                    completed["delegation_count"] >= 1
                    and completed["model_call_count"] >= 2
                    and any(
                        e["event_type"] == "tool_completed"
                        and e["tool_name"] == "read_saved_context"
                        and e["agent_name"] == specialist
                        for e in completed["events"]
                    )
                ):
                    raise ApiError(
                        502,
                        "INVALID_ASSISTANT_RESULT",
                        "The assistant did not complete its authorized specialist read.",
                    )
                context = await asyncio.to_thread(self._check, principal, case_id, run.id)
                result = render_result(context, narrative)
                return await asyncio.to_thread(self._finish, principal, case_id, run.id, result)
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
                    "The assistant did not complete. Read its recorded result before retrying.",
                    retryable=True,
                    run_id=run.id,
                )
            )
            terminal = (
                "cancelled"
                if failure.code == "ASSISTANT_CANCELLED"
                else "timed_out"
                if failure.code == "RUN_TIMEOUT"
                else "interrupted"
                if isinstance(error, asyncio.CancelledError)
                or failure.code == "CLIENT_DISCONNECTED"
                else "failed"
            )
            try:
                return await asyncio.shield(
                    asyncio.to_thread(
                        self._finish, principal, case_id, run.id, None, failure, terminal
                    )
                )
            except Exception:
                raise failure from error

    def get(self, principal, case_id, run_id):
        require_id(run_id, "Assistant run")
        docs = self._raw(principal, case_id, run_id)
        raw = docs["run"]
        if raw["status"] == "running" and raw["expires_at"] <= now():
            return self._finish(
                principal,
                case_id,
                run_id,
                error=ApiError(
                    503, "RUN_INTERRUPTED", "The assistant lease expired without a saved answer."
                ),
                status="interrupted",
            )
        result = self._public(raw, case_id, run_id, docs["case"]["data_revision"])
        if result.status == "succeeded" and result.is_current:
            try:
                self._check_finished(principal, case_id, raw)
            except ApiError as error:
                result.is_current = False if error.status == 409 else None
        return result

    def _check_finished(self, principal, case_id, raw):
        context = self._context(principal, case_id, AssistantRequest.model_validate(raw["payload"]))
        if context["source_fingerprint"] != raw["source_fingerprint"]:
            raise ApiError(
                409, "ASSISTANT_INPUT_CHANGED", "The answer refers to older saved inputs."
            )

    def operation(self, principal, case_id, key):
        op = self.repo.read(principal.uid, case_id, {"op": self._key(key)})["op"]
        if not op:
            raise ApiError(
                404,
                "ASSISTANT_OPERATION_NOT_FOUND",
                "No assistant request is recorded for this key.",
            )
        if op.get("cancelled"):
            raise ApiError(
                409, "OPERATION_CANCELLED", "This assistant request was closed before starting."
            )
        return self.get(principal, case_id, op["run_id"])

    def events(self, principal, case_id, run_id):
        self.get(principal, case_id, run_id)
        raw = self._raw(principal, case_id, run_id)["run"]
        return AssistantEvents(run_id=run_id, items=raw["events"])

    def list(self, principal, case_id):
        index = self.repo.read(principal.uid, case_id, {"index": "assistant_state/index"})["index"]
        return AssistantRunList(
            case_id=case_id,
            items=[self.get(principal, case_id, run_id) for run_id in self._ids(index)],
        )

    def cancel(self, principal, case_id, key):
        path = self._key(key)
        op = self.repo.read(principal.uid, case_id, {"op": path})["op"]
        paths = {"op": path}
        if op and op.get("run_id"):
            paths["run"] = f"assistant_runs/{op['run_id']}"

        def close(docs):
            current = docs["op"]
            if not current or current.get("cancelled"):
                return AssistantCancellation(request_key=key, case_id=case_id, state="cancelled"), {
                    "op": {"cancelled": True, "created_at": now()}
                }
            if current.get("run_id") != (op or {}).get("run_id"):
                raise ApiError(
                    409,
                    "ASSISTANT_OPERATION_CHANGED",
                    "The request started. Read it and cancel again.",
                )
            raw = docs["run"]
            parsed = self._public(raw, case_id, current["run_id"])
            writes = {}
            if parsed.status == "running":
                raw["cancel_requested"] = True
                writes["run"] = raw
            return AssistantCancellation(
                request_key=key, case_id=case_id, state="recorded", run_id=current["run_id"]
            ), writes

        return self.repo.atomic(principal.uid, case_id, paths, close)


class AssistantHooks:
    def __init__(self, service, principal, case_id, run_id):
        self.service, self.principal, self.case_id, self.run_id = (
            service,
            principal,
            case_id,
            run_id,
        )

    async def read_context(self):
        return await asyncio.to_thread(
            self.service._check, self.principal, self.case_id, self.run_id
        )

    async def _event(self, kind, agent=None, tool=None):
        context = await self.read_context()
        await asyncio.to_thread(
            self.service._record,
            self.principal,
            self.case_id,
            self.run_id,
            kind,
            agent,
            tool,
            context["source_guards"],
        )

    async def before_model(self, agent):
        await self._event("model", agent)

    async def before_agent(self, agent):
        await self._event("agent_started", agent)

    async def before_tool(self, agent, tool):
        await self._event("tool_started", agent, tool)

    async def after_tool(self, agent, tool):
        await self._event("tool_completed", agent, tool)
