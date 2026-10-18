"""Authenticated bounded assistant requests and durable polling/readback."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Request, Response

from app.models.assistant import (
    AssistantCancellation,
    AssistantEvents,
    AssistantRequest,
    AssistantRun,
    AssistantRunList,
)
from app.models.quotations import RequestKey
from app.security import Principal


def assistant_router(principal_dependency, service_dependency):
    router = APIRouter(prefix="/api/v1/cases/{case_id}", tags=["contextual assistant"])
    Identity = Annotated[Principal, Depends(principal_dependency)]
    Service = Annotated[Any, Depends(service_dependency)]
    Idempotency = Annotated[RequestKey, Header(alias="Idempotency-Key")]

    @router.post("/assistant-runs", response_model=AssistantRun)
    async def run_assistant(
        case_id: str,
        payload: AssistantRequest,
        request: Request,
        response: Response,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return await service.run(
            principal, case_id, idempotency_key, payload, disconnected=request.is_disconnected
        )

    @router.get("/assistant-runs", response_model=AssistantRunList)
    def list_runs(case_id: str, response: Response, principal: Identity, service: Service):
        response.headers["Cache-Control"] = "private, no-store"
        return service.list(principal, case_id)

    @router.get("/assistant-runs/{run_id}", response_model=AssistantRun)
    def get_run(
        case_id: str, run_id: str, response: Response, principal: Identity, service: Service
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.get(principal, case_id, run_id)

    @router.get("/assistant-runs/{run_id}/events", response_model=AssistantEvents)
    def events(
        case_id: str, run_id: str, response: Response, principal: Identity, service: Service
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.events(principal, case_id, run_id)

    @router.get("/assistant-operations/{request_key}", response_model=AssistantRun)
    def operation(
        case_id: str,
        request_key: RequestKey,
        response: Response,
        principal: Identity,
        service: Service,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.operation(principal, case_id, request_key)

    @router.post("/assistant-operations/{request_key}/cancel", response_model=AssistantCancellation)
    def cancel(
        case_id: str,
        request_key: RequestKey,
        response: Response,
        principal: Identity,
        service: Service,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.cancel(principal, case_id, request_key)

    return router
