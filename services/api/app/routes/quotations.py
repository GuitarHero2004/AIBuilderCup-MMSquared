"""Authenticated human-facing quotation API; no agent receives confirmation routes."""

import asyncio
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, Request
from starlette.datastructures import UploadFile
from starlette.responses import Response

from app.errors import ApiError
from app.models.quotations import (
    CloseOperation,
    ConfirmedRevision,
    ConfirmQuote,
    MutationReceipt,
    OperationResolution,
    QuoteList,
    QuoteRead,
    RequestKey,
    RunEvents,
    RunRead,
    SaveDraft,
    StartExtraction,
)
from app.security import Principal
from app.services.quotations import QuotationService


def quotation_router(principal_dependency, service_dependency) -> APIRouter:
    router = APIRouter(prefix="/api/v1/cases/{case_id}", tags=["quotations"])
    Identity = Annotated[Principal, Depends(principal_dependency)]
    Service = Annotated[QuotationService, Depends(service_dependency)]
    Idempotency = Annotated[RequestKey, Header(alias="Idempotency-Key")]

    @router.get("/quotes", response_model=QuoteList)
    def list_quotes(case_id: str, principal: Identity, service: Service):
        return service.list(principal, case_id)

    @router.post(
        "/quotes",
        response_model=MutationReceipt,
        status_code=201,
        openapi_extra={
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "type": "object",
                            "required": ["file", "expected_case_revision", "is_synthetic"],
                            "properties": {
                                "file": {"type": "string", "format": "binary"},
                                "expected_case_revision": {"type": "integer", "minimum": 1},
                                "is_synthetic": {"type": "boolean", "const": True},
                            },
                        }
                    }
                },
            },
        },
    )
    async def upload_quote(
        case_id: str,
        request: Request,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        # Dependencies verified identity/App Check before reading or parsing the multipart body.
        await asyncio.to_thread(service.repo.read, principal.uid, case_id, {})
        maximum = service.settings.maximum_pdf_bytes + 64 * 1024
        content = bytearray()
        async for chunk in request.stream():
            if len(content) + len(chunk) > maximum:
                raise ApiError(413, "PDF_TOO_LARGE", "The upload exceeds the configured PDF limit.")
            content.extend(chunk)
        # Bound actual stream bytes before parsing; Content-Length is not trusted.
        request._body = bytes(content)
        try:
            async with request.form(max_files=1, max_fields=2, max_part_size=2048) as form:
                items = list(form.multi_items())
                if len(items) != 3 or {key for key, _ in items} != {
                    "file",
                    "expected_case_revision",
                    "is_synthetic",
                }:
                    raise ApiError(
                        422, "INVALID_UPLOAD", "Provide one PDF and its required upload details."
                    )
                file = form["file"]
                revision_text = form["expected_case_revision"]
                if (
                    not isinstance(file, UploadFile)
                    or not isinstance(revision_text, str)
                    or not revision_text.isascii()
                    or not revision_text.isdigit()
                    or not 1 <= int(revision_text) <= 1000000
                    or form["is_synthetic"] != "true"
                ):
                    raise ApiError(
                        422,
                        "INVALID_UPLOAD",
                        "Use one synthetic PDF and the current case revision.",
                    )
                data = await file.read(service.settings.maximum_pdf_bytes + 1)
                return await asyncio.to_thread(
                    service.upload,
                    principal,
                    case_id,
                    idempotency_key,
                    int(revision_text),
                    data,
                    file.filename or "quotation.pdf",
                    file.content_type or "",
                    True,
                )
        except ApiError:
            raise
        except (ValueError, KeyError) as error:
            raise ApiError(422, "INVALID_UPLOAD", "The upload form could not be read.") from error

    @router.get("/quote-intakes/{request_key}", response_model=MutationReceipt)
    def intake_receipt(
        case_id: str, request_key: RequestKey, principal: Identity, service: Service
    ):
        return service.intake_operation(principal, case_id, request_key)

    @router.get("/quotes/{quote_id}", response_model=QuoteRead)
    def get_quote(case_id: str, quote_id: str, principal: Identity, service: Service):
        return service.get(principal, case_id, quote_id)

    @router.get(
        "/quotes/{quote_id}/document",
        response_class=Response,
        responses={200: {"content": {"application/pdf": {}}}},
    )
    def get_document(case_id: str, quote_id: str, principal: Identity, service: Service):
        content, name = service.document(principal, case_id, quote_id)
        return Response(
            content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename*=UTF-8''{quote(name, safe='')}",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "sandbox",
            },
        )

    @router.patch("/quotes/{quote_id}/draft", response_model=MutationReceipt)
    def save_draft(
        case_id: str,
        quote_id: str,
        payload: SaveDraft,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        return service.save(principal, case_id, quote_id, idempotency_key, payload)

    @router.post("/quotes/{quote_id}/confirm", response_model=MutationReceipt)
    def confirm_quote(
        case_id: str,
        quote_id: str,
        payload: ConfirmQuote,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        return service.confirm(
            principal, case_id, quote_id, idempotency_key, payload, actor="human_route"
        )

    @router.get(
        "/quotes/{quote_id}/review-operations/{request_key}", response_model=MutationReceipt
    )
    def review_receipt(
        case_id: str, quote_id: str, request_key: RequestKey, principal: Identity, service: Service
    ):
        return service.review_operation(principal, case_id, quote_id, request_key)

    @router.get("/quotes/{quote_id}/revisions/{revision_id}", response_model=ConfirmedRevision)
    def confirmed_revision(
        case_id: str, quote_id: str, revision_id: str, principal: Identity, service: Service
    ):
        return service.revision(principal, case_id, quote_id, revision_id)

    @router.post("/agent-runs", response_model=RunRead)
    async def extraction(
        case_id: str,
        payload: StartExtraction,
        request: Request,
        principal: Identity,
        service: Service,
        idempotency_key: Idempotency,
    ):
        return await service.extract(
            principal, case_id, idempotency_key, payload, disconnected=request.is_disconnected
        )

    @router.get("/run-operations/{request_key}", response_model=RunRead)
    def run_receipt(case_id: str, request_key: RequestKey, principal: Identity, service: Service):
        return service.run_operation(principal, case_id, request_key)

    @router.get("/runs/{run_id}", response_model=RunRead)
    def get_run(case_id: str, run_id: str, principal: Identity, service: Service):
        return service.run(principal, case_id, run_id)

    @router.get("/runs/{run_id}/events", response_model=RunEvents)
    def get_events(case_id: str, run_id: str, principal: Identity, service: Service):
        return service.run_events(principal, case_id, run_id)

    @router.post("/quotation-operations/{request_key}/cancel", response_model=OperationResolution)
    def close_operation(
        case_id: str,
        request_key: RequestKey,
        payload: CloseOperation,
        principal: Identity,
        service: Service,
    ):
        return service.close_operation(principal, case_id, request_key, payload)

    return router
