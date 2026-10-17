"""Bounded PDF inspection and immutable private objects; no public URLs or local fixtures."""

import hashlib
import io
import json
import logging
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from google.api_core.exceptions import GoogleAPICallError, NotFound, PreconditionFailed
from google.auth.credentials import AnonymousCredentials
from google.auth.exceptions import GoogleAuthError
from google.cloud import storage
from pypdf import PdfReader
from requests.exceptions import RequestException

from app.config import Settings, is_loopback_host_port
from app.errors import ApiError

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 10
MAX_EXTRACTION_BYTES = 300 * 1024
_ID = r"[A-Za-z0-9_-]{1,128}"
_OBJECT_PATH = re.compile(
    rf"users/[a-f0-9]{{64}}/cases/{_ID}/(?:quotes/{_ID}/source\.pdf|runs/{_ID}/extraction\.json)"
)


@dataclass(frozen=True)
class ValidatedPdf:
    file_name: str
    mime_type: str
    size_bytes: int
    page_count: int
    sha256: str


@dataclass(frozen=True)
class StoredObject:
    object_path: str
    generation: str


def _safe_file_name(filename: str) -> str:
    # Never put caller filenames in object paths or response headers.
    name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(c for c in name if not unicodedata.category(c).startswith("C"))
    name = name.strip().strip(".")[:180]
    if not name.lower().endswith(".pdf"):
        name = (name[:176] or "quotation") + ".pdf"
    return name or "quotation.pdf"


def validate_pdf(data: bytes, filename: str, mime: str) -> ValidatedPdf:
    """Inspect untrusted bytes in a killable process, not an unbounded request thread."""
    if mime.lower().split(";", 1)[0].strip() != "application/pdf":
        raise ApiError(422, "UNSUPPORTED_FILE_TYPE", "Choose a PDF quotation file.")
    if not data or len(data) > MAX_PDF_BYTES:
        raise ApiError(413, "PDF_SIZE_LIMIT", "Choose a non-empty PDF no larger than 10 MiB.")
    if not re.match(rb"%PDF-[12]\.\d", data[:8]):
        raise ApiError(422, "INVALID_PDF", "This file is not a readable PDF. Export it again.")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "app.adapters.quotation_documents", "--inspect"],
            input=data,
            capture_output=True,
            timeout=8,
            check=False,
            cwd=Path(__file__).resolve().parents[2],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        inspected = json.loads(result.stdout) if result.returncode == 0 else {}
    except (subprocess.TimeoutExpired, OSError, ValueError) as error:
        raise ApiError(
            422, "UNREADABLE_PDF", "This PDF could not be checked. Export a simpler PDF and retry."
        ) from error
    code = inspected.get("error")
    if code == "encrypted":
        raise ApiError(
            422, "ENCRYPTED_PDF", "Remove the PDF password or export an unencrypted copy."
        )
    if code == "pages":
        raise ApiError(422, "PDF_PAGE_LIMIT", "Choose a PDF with between 1 and 10 pages.")
    pages = inspected.get("pages")
    if code or type(pages) is not int or not 1 <= pages <= MAX_PDF_PAGES:
        raise ApiError(422, "INVALID_PDF", "This PDF is damaged or unsupported. Export it again.")
    return ValidatedPdf(
        _safe_file_name(filename),
        "application/pdf",
        len(data),
        pages,
        hashlib.sha256(data).hexdigest(),
    )


def read_pdf_page_text(data: bytes) -> list[str]:
    """Best-effort digital-text evidence, bounded by the same isolated parser."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "app.adapters.quotation_documents", "--text"],
            input=data,
            capture_output=True,
            timeout=8,
            check=False,
            cwd=Path(__file__).resolve().parents[2],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        payload = json.loads(result.stdout) if result.returncode == 0 else {}
        texts = payload.get("texts")
        if isinstance(texts, list) and len(texts) <= MAX_PDF_PAGES:
            return [text if isinstance(text, str) else "" for text in texts]
    except (subprocess.TimeoutExpired, OSError, ValueError):
        pass
    return []


def _inspect_pdf(*, include_text: bool = False) -> None:
    # Linux Cloud Run gets a child-only memory/CPU ceiling; the parent always enforces wall time.
    if sys.platform != "win32":
        import resource

        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    logging.disable(logging.CRITICAL)
    try:
        data = sys.stdin.buffer.read(MAX_PDF_BYTES + 1)
        if len(data) > MAX_PDF_BYTES:
            raise ValueError("limit")
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            print(json.dumps({"error": "encrypted"}))
            return
        # Iteration stops at the application limit even if the PDF advertises many pages.
        pages = 0
        texts = []
        for page in reader.pages:
            if page.get("/Type") != "/Page":
                raise ValueError("page")
            pages += 1
            if pages > MAX_PDF_PAGES:
                break
            if include_text:
                # Only use bounded excerpts for corroboration, never as instructions or logs.
                texts.append((page.extract_text() or "")[:50000])
        payload = {"pages": pages} if 1 <= pages <= 10 else {"error": "pages"}
        if include_text and "error" not in payload:
            payload["texts"] = texts
        print(json.dumps(payload))
    except Exception:
        # Parser errors may contain source content. Only a fixed code leaves this child.
        print(json.dumps({"error": "invalid"}))


def _unavailable() -> ApiError:
    return ApiError(
        503,
        "DOCUMENT_STORAGE_UNAVAILABLE",
        "Quotation file storage is unavailable. Retry shortly.",
        retryable=True,
    )


class QuotationDocumentStore:
    """The service must authorize the owner before passing its stored object reference here."""

    def __init__(self, settings: Settings, *, client=None):
        self.settings = settings
        self._client = client  # Injectable only by trusted application/test code.
        self.bucket_name = settings.storage_bucket
        if settings.app_env == "local" and not self.bucket_name:
            self.bucket_name = f"{settings.google_cloud_project}.appspot.com"

    @property
    def enabled(self) -> bool:
        return bool(self.bucket_name) and (
            self.settings.app_env != "local" or bool(self.settings.firebase_storage_emulator_host)
        )

    def _get_client(self):
        if not self.enabled:
            raise ApiError(
                503, "DOCUMENT_STORAGE_NOT_CONFIGURED", "Quotation storage is not ready."
            )
        if self._client is None:
            try:
                if self.settings.app_env == "local":
                    host = self.settings.firebase_storage_emulator_host or ""
                    if not is_loopback_host_port(host):
                        raise ApiError(
                            503, "DOCUMENT_STORAGE_NOT_CONFIGURED", "Storage is not ready."
                        )
                    self._client = storage.Client(
                        project=self.settings.google_cloud_project,
                        credentials=AnonymousCredentials(),
                        client_options={"api_endpoint": f"http://{host}"},
                    )
                    # Local test traffic must not be redirected through an ambient HTTP proxy.
                    self._client._http.trust_env = False
                else:
                    self._client = storage.Client(project=self.settings.google_cloud_project)
            except (GoogleAuthError, ValueError) as error:
                raise _unavailable() from error
        return self._client

    @staticmethod
    def _prefix(owner_uid: str, case_id: str) -> str:
        if not owner_uid or len(owner_uid) > 128 or not re.fullmatch(_ID, case_id):
            raise ApiError(
                503, "INVALID_DOCUMENT_REFERENCE", "The document reference is unavailable."
            )
        # Firebase UIDs need not be path-safe; the storage key never contains raw identity text.
        owner_key = hashlib.sha256(owner_uid.encode()).hexdigest()
        return f"users/{owner_key}/cases/{case_id}"

    @staticmethod
    def _check_path(object_path: str, generation: str | None = None) -> None:
        if not _OBJECT_PATH.fullmatch(object_path) or (
            generation is not None and not re.fullmatch(r"[1-9][0-9]{0,30}", str(generation))
        ):
            raise ApiError(
                503, "INVALID_DOCUMENT_REFERENCE", "The document reference is unavailable."
            )

    def _put(self, path: str, data: bytes, mime: str) -> StoredObject:
        self._check_path(path)
        try:
            blob = self._get_client().bucket(self.bucket_name).blob(path)
            # Firebase's emulator omits GCS generation preconditions. This read check catches
            # accidental local reuse, but is not a substitute for production atomicity tests.
            if self.settings.app_env == "local" and blob.exists(timeout=5, retry=None):
                raise ApiError(
                    409,
                    "DOCUMENT_ALREADY_EXISTS",
                    "This document is already saved. Reload its state.",
                )
            blob.cache_control = "private, no-store"
            blob.upload_from_string(
                data,
                content_type=mime,
                if_generation_match=0,
                timeout=10,
                retry=None,
                checksum="crc32c",
            )
            generation = str(blob.generation or "")
            self._check_path(path, generation)
            return StoredObject(path, generation)
        except PreconditionFailed as error:
            raise ApiError(
                409, "DOCUMENT_ALREADY_EXISTS", "This document is already saved. Reload its state."
            ) from error
        except (GoogleAPICallError, GoogleAuthError, RequestException) as error:
            raise _unavailable() from error

    @classmethod
    def pdf_object_path(cls, owner_uid: str, case_id: str, quote_id: str) -> str:
        """Derive a private staging reference before I/O, including ambiguous upload outcomes."""
        path = f"{cls._prefix(owner_uid, case_id)}/quotes/{quote_id}/source.pdf"
        cls._check_path(path)
        return path

    def upload_pdf(self, owner_uid: str, case_id: str, quote_id: str, data: bytes) -> StoredObject:
        if not 0 < len(data) <= MAX_PDF_BYTES:
            raise ApiError(413, "PDF_SIZE_LIMIT", "Choose a PDF no larger than 10 MiB.")
        path = self.pdf_object_path(owner_uid, case_id, quote_id)
        return self._put(path, data, "application/pdf")

    def put_extraction(
        self, owner_uid: str, case_id: str, run_id: str, payload: bytes
    ) -> StoredObject:
        if not 0 < len(payload) <= MAX_EXTRACTION_BYTES:
            raise ApiError(502, "EXTRACTION_OUTPUT_LIMIT", "The extracted result was too large.")
        path = f"{self._prefix(owner_uid, case_id)}/runs/{run_id}/extraction.json"
        return self._put(path, payload, "application/json")

    def download_pdf(self, object_path: str, generation: str) -> bytes:
        self._check_path(object_path, generation)
        if not object_path.endswith("/source.pdf"):
            raise ApiError(404, "DOCUMENT_NOT_FOUND", "The original PDF is unavailable.")
        try:
            blob = (
                self._get_client()
                .bucket(self.bucket_name)
                .blob(object_path, generation=int(generation))
            )
            if self.settings.app_env == "local":
                blob.reload(timeout=5, retry=None)
                if str(blob.generation) != str(generation):
                    raise ApiError(404, "DOCUMENT_NOT_FOUND", "The original PDF is unavailable.")
            data = blob.download_as_bytes(
                if_generation_match=int(generation),
                end=MAX_PDF_BYTES,
                timeout=10,
                retry=None,
                raw_download=True,
            )
            if not 0 < len(data) <= MAX_PDF_BYTES:
                raise ApiError(
                    503, "INVALID_DOCUMENT_REFERENCE", "The original PDF is unavailable."
                )
            return data
        except (NotFound, PreconditionFailed) as error:
            raise ApiError(404, "DOCUMENT_NOT_FOUND", "The original PDF is unavailable.") from error
        except (GoogleAPICallError, GoogleAuthError, RequestException) as error:
            raise _unavailable() from error

    def delete(self, object_path: str, generation: str) -> None:
        """Only a known failed, unreferenced staged object may be removed by the service."""
        self._check_path(object_path, generation)
        try:
            blob = (
                self._get_client()
                .bucket(self.bucket_name)
                .blob(object_path, generation=int(generation))
            )
            if self.settings.app_env == "local":
                blob.reload(timeout=5, retry=None)
                if str(blob.generation) != str(generation):
                    raise ApiError(409, "SOURCE_REFERENCE_CHANGED", "The stored file has changed.")
            blob.delete(if_generation_match=int(generation), timeout=10, retry=None)
        except NotFound:
            return
        except (GoogleAPICallError, GoogleAuthError, RequestException) as error:
            raise _unavailable() from error

    def close(self) -> None:
        if self._client is not None:
            self._client.close()


if __name__ == "__main__" and sys.argv[1:] in (["--inspect"], ["--text"]):
    _inspect_pdf(include_text=sys.argv[1] == "--text")
