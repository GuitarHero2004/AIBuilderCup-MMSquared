"""Application factory: construction/OpenAPI export does not contact Google services."""

import logging
from contextlib import asynccontextmanager
from threading import Lock
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from app.adapters.firestore_cases import FirestoreCaseRepository
from app.config import Settings
from app.errors import ApiError, ErrorDetail, ErrorEnvelope
from app.models.cases import CaseCreate, CaseList, CaseRead
from app.security import FirebaseIdentityVerifier, IdentityVerifier, Principal
from app.services.cases import CaseRepository, CaseService

logger = logging.getLogger("greenprocure.api")


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    environment: Literal["local", "production"]
    storage: Literal["firestore"] = "firestore"
    ai_enabled: Literal[False] = False


def get_principal(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_firebase_appcheck: Annotated[str | None, Header()] = None,
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "AUTH_REQUIRED", "Start a demo session to continue.")
    token = authorization[7:]
    if not token or len(token) > 8192:
        raise ApiError(401, "INVALID_IDENTITY", "Your session is invalid. Sign in again.")
    with request.app.state.resource_lock:
        if request.app.state.identity_verifier is None:
            request.app.state.identity_verifier = FirebaseIdentityVerifier(
                request.app.state.settings
            )
    return request.app.state.identity_verifier.verify(token, x_firebase_appcheck)


def get_case_service(request: Request) -> CaseService:
    with request.app.state.resource_lock:
        if request.app.state.case_repository is None:
            request.app.state.case_repository = FirestoreCaseRepository(request.app.state.settings)
    return CaseService(
        request.app.state.case_repository, request.app.state.settings.maximum_cases_per_user
    )


def create_app(
    settings: Settings | None = None,
    *,
    repository: CaseRepository | None = None,
    identity_verifier: IdentityVerifier | None = None,
) -> FastAPI:
    config = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        for resource in (app.state.case_repository, app.state.identity_verifier):
            close = getattr(resource, "close", None)
            if close:
                close()

    app = FastAPI(
        title="GreenProcure API",
        version="0.1.0",
        lifespan=lifespan,
        description=(
            "Synthetic case foundation. Extraction, agents and evaluation are not implemented."
        ),
        responses={code: {"model": ErrorEnvelope} for code in (401, 403, 404, 422, 429, 503)},
    )
    app.state.settings = config
    app.state.case_repository = repository
    app.state.identity_verifier = identity_verifier
    app.state.resource_lock = Lock()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-Firebase-AppCheck"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request.state.request_id = uuid4().hex
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    def error_response(request: Request, error: ApiError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", uuid4().hex)
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code=error.code,
                message=error.message,
                retryable=error.retryable,
                request_id=request_id,
            )
        )
        return JSONResponse(
            envelope.model_dump(), status_code=error.status, headers={"X-Request-ID": request_id}
        )

    @app.exception_handler(ApiError)
    async def api_error(request: Request, error: ApiError):
        return error_response(request, error)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError):
        return error_response(
            request,
            ApiError(
                422,
                "INVALID_INPUT",
                "Check the required names, dates, decimal amounts and composition.",
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException):
        return error_response(
            request, ApiError(error.status_code, "HTTP_ERROR", "Request not available.")
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception):
        logger.error(
            "request_failed request_id=%s type=%s", request.state.request_id, type(error).__name__
        )
        return error_response(
            request, ApiError(500, "INTERNAL_ERROR", "The request could not be completed.")
        )

    @app.get("/healthz", response_model=Health)
    def health() -> Health:
        return Health(environment=config.app_env)

    @app.get("/api/v1/cases", response_model=CaseList)
    def list_cases(
        principal: Annotated[Principal, Depends(get_principal)],
        service: Annotated[CaseService, Depends(get_case_service)],
    ) -> CaseList:
        return CaseList(items=service.list(principal))

    @app.post("/api/v1/cases", response_model=CaseRead, status_code=201)
    def create_case(
        payload: CaseCreate,
        principal: Annotated[Principal, Depends(get_principal)],
        service: Annotated[CaseService, Depends(get_case_service)],
    ) -> CaseRead:
        return service.create(principal, payload)

    @app.get("/api/v1/cases/{case_id}", response_model=CaseRead)
    def get_case(
        case_id: str,
        principal: Annotated[Principal, Depends(get_principal)],
        service: Annotated[CaseService, Depends(get_case_service)],
    ) -> CaseRead:
        return service.get(principal, case_id)

    return app
