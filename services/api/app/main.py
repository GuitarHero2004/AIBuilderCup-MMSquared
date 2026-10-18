"""Application factory: construction/OpenAPI export does not contact Google services."""

import inspect
import logging
from contextlib import asynccontextmanager
from threading import Lock
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from app.adapters.firestore_cases import FirestoreCaseRepository
from app.adapters.firestore_quotations import FirestoreQuotationRepository
from app.config import Settings
from app.errors import ApiError, ErrorDetail, ErrorEnvelope
from app.models.cases import CaseCreate, CaseList, CaseRead
from app.models.comparison import CaseComparison
from app.routes.quotations import quotation_router
from app.routes.selections import selection_router
from app.security import FirebaseIdentityVerifier, IdentityVerifier, Principal
from app.services.cases import CaseRepository, CaseService
from app.services.comparison import ComparisonService
from app.services.quotations import QuotationRepository, QuotationService

logger = logging.getLogger("greenprocure.api")


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    environment: Literal["local", "production"]
    storage: Literal["firestore"] = "firestore"
    ai_enabled: bool = False


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


def get_quotation_service(request: Request) -> QuotationService:
    with request.app.state.resource_lock:
        settings = request.app.state.settings
        if request.app.state.quotation_repository is None:
            request.app.state.quotation_repository = FirestoreQuotationRepository(settings)
        if request.app.state.document_store is None:
            from app.adapters.quotation_documents import QuotationDocumentStore

            request.app.state.document_store = QuotationDocumentStore(settings)
        if request.app.state.extraction_provider is None:
            from app.adapters.gemini_quotation import GeminiQuotationProvider

            request.app.state.extraction_provider = GeminiQuotationProvider(settings)
    return QuotationService(
        request.app.state.quotation_repository,
        settings,
        request.app.state.document_store,
        request.app.state.extraction_provider,
    )


def get_comparison_service(request: Request) -> ComparisonService:
    with request.app.state.resource_lock:
        if request.app.state.quotation_repository is None:
            request.app.state.quotation_repository = FirestoreQuotationRepository(
                request.app.state.settings
            )
    return ComparisonService(
        request.app.state.quotation_repository,
        request.app.state.settings.maximum_quotes_per_case,
    )


def get_selection_service(request: Request):
    from app.services.selections import SelectionService

    with request.app.state.resource_lock:
        if request.app.state.quotation_repository is None:
            request.app.state.quotation_repository = FirestoreQuotationRepository(
                request.app.state.settings
            )
    return SelectionService(
        request.app.state.quotation_repository,
        request.app.state.settings.maximum_quotes_per_case,
    )


def create_app(
    settings: Settings | None = None,
    *,
    repository: CaseRepository | None = None,
    identity_verifier: IdentityVerifier | None = None,
    quotation_repository: QuotationRepository | None = None,
    document_store=None,
    extraction_provider=None,
) -> FastAPI:
    config = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        for resource in (
            app.state.case_repository,
            app.state.identity_verifier,
            app.state.quotation_repository,
            app.state.document_store,
            app.state.extraction_provider,
        ):
            close = getattr(resource, "close", None)
            if close:
                result = close()
                if inspect.isawaitable(result):
                    await result

    app = FastAPI(
        title="GreenProcure API",
        version="0.1.0",
        lifespan=lifespan,
        description=(
            "Private synthetic quotation intake, direct Gemini extraction and human review. "
            "Confirmed quotation checks and human buyer selection notes are available; "
            "ranking and agent orchestration "
            "are not implemented."
        ),
        responses={code: {"model": ErrorEnvelope} for code in (401, 403, 404, 422, 429, 503)},
    )
    app.state.settings = config
    app.state.case_repository = repository
    app.state.identity_verifier = identity_verifier
    app.state.quotation_repository = quotation_repository
    app.state.document_store = document_store
    app.state.extraction_provider = extraction_provider
    app.state.resource_lock = Lock()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Firebase-AppCheck", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request.state.request_id = uuid4().hex
        if request.method in {"POST", "PATCH"} and not request.headers.get(
            "content-type", ""
        ).lower().startswith("multipart/form-data"):
            # Bound actual JSON bytes before Pydantic parsing, including chunked requests.
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > 512 * 1024:
                    return error_response(
                        request,
                        ApiError(
                            413,
                            "REQUEST_TOO_LARGE",
                            "The request is too large. Shorten review notes.",
                        ),
                    )
                body.extend(chunk)
            request._body = bytes(body)
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
                run_id=error.run_id,
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

    @app.get("/api/health", response_model=Health, include_in_schema=False)
    @app.get("/healthz", response_model=Health)
    def health() -> Health:
        return Health(environment=config.app_env, ai_enabled=config.ai_enabled)

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

    @app.get("/api/v1/cases/{case_id}/comparison", response_model=CaseComparison)
    def get_comparison(
        case_id: str,
        response: Response,
        principal: Annotated[Principal, Depends(get_principal)],
        service: Annotated[ComparisonService, Depends(get_comparison_service)],
        expected_case_revision: Annotated[int | None, Query(ge=1, le=1000000)] = None,
    ) -> CaseComparison:
        response.headers["Cache-Control"] = "private, no-store"
        return service.get(principal, case_id, expected_case_revision)

    app.include_router(quotation_router(get_principal, get_quotation_service))
    app.include_router(selection_router(get_principal, get_selection_service))
    return app
