"""Human-only buyer selection notes and explicit save recovery."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Response

from app.models.quotations import RequestKey
from app.models.selections import SelectionCreate, SelectionList, SelectionOperation, SelectionRead
from app.security import Principal


def selection_router(principal_dependency, service_dependency) -> APIRouter:
    router = APIRouter(
        prefix="/api/v1/cases/{case_id}",
        tags=["buyer selections"],
        responses={409: {"description": "Saved inputs changed or request reference conflicts"}},
    )
    Identity = Annotated[Principal, Depends(principal_dependency)]
    Service = Annotated[Any, Depends(service_dependency)]
    Idempotency = Annotated[RequestKey, Header(alias="Idempotency-Key")]

    @router.post("/selections", response_model=SelectionOperation, status_code=201)
    def save_selection(
        case_id: str,
        payload: SelectionCreate,
        response: Response,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.save(principal, case_id, idempotency_key, payload, actor="human_route")

    @router.get("/selections", response_model=SelectionList)
    def list_selections(case_id: str, response: Response, principal: Identity, service: Service):
        response.headers["Cache-Control"] = "private, no-store"
        return service.list(principal, case_id)

    @router.get("/selections/{selection_id}", response_model=SelectionRead)
    def get_selection(
        case_id: str,
        selection_id: str,
        response: Response,
        principal: Identity,
        service: Service,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.get(principal, case_id, selection_id)

    @router.get("/selection-operations/{request_key}", response_model=SelectionOperation)
    def selection_operation(
        case_id: str,
        request_key: RequestKey,
        response: Response,
        principal: Identity,
        service: Service,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.operation(principal, case_id, request_key)

    @router.post("/selection-operations/{request_key}/cancel", response_model=SelectionOperation)
    def cancel_selection_operation(
        case_id: str,
        request_key: RequestKey,
        response: Response,
        principal: Identity,
        service: Service,
    ):
        response.headers["Cache-Control"] = "private, no-store"
        return service.cancel(principal, case_id, request_key)

    return router
