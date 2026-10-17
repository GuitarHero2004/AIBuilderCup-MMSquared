"""Stable public errors with no credentials, raw input or provider messages."""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool
    request_id: str
    run_id: str | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        *,
        retryable: bool = False,
        run_id: str | None = None,
    ):
        super().__init__(code)
        self.status = status
        self.code = code
        self.message = message
        self.retryable = retryable
        self.run_id = run_id
