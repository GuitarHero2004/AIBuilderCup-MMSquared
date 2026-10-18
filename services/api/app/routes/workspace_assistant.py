"""Authenticated workspace-wide assistant routes with durable operation recovery."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Request, Response

from app.models.quotations import RequestKey
from app.models.workspace_assistant import (
    WorkspaceAssistantSnapshot,
    WorkspaceNavigationRequest,
    WorkspaceNavigationResult,
)
from app.security import Principal


def workspace_assistant_router(principal_dependency, service_dependency):
    router = APIRouter(prefix="/api/v1/assistant", tags=["workspace assistant"])
    Identity = Annotated[Principal, Depends(principal_dependency)]
    Service = Annotated[Any, Depends(service_dependency)]
    Idempotency = Annotated[RequestKey, Header(alias="Idempotency-Key")]

    @router.get("/workspace", response_model=WorkspaceAssistantSnapshot)
    def workspace(response: Response, principal: Identity, service: Service):
        response.headers["Cache-Control"] = "private, no-store"
        return service.workspace(principal)

    @router.post("/navigate", response_model=WorkspaceNavigationResult)
    async def navigate(
        payload: WorkspaceNavigationRequest,
        request: Request,
        response: Response,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return await service.navigate(
            principal, idempotency_key, payload, disconnected=request.is_disconnected
        )

    @router.get("/navigation-operations/{request_key}", response_model=WorkspaceNavigationResult)
    def operation(
        request_key: RequestKey, response: Response, principal: Identity, service: Service
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.operation(principal, request_key)

    @router.post(
        "/navigation-operations/{request_key}/cancel", response_model=WorkspaceNavigationResult
    )
    def cancel(request_key: RequestKey, response: Response, principal: Identity, service: Service):
        response.headers["Cache-Control"] = "private, no-store"
        return service.cancel(principal, request_key)

    return router
