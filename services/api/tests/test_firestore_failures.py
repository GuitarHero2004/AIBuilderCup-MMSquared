"""Exercise the SDK's real exception contracts without requiring a cloud service."""

from datetime import UTC, datetime
from unittest.mock import Mock
from uuid import uuid4

import pytest
from google.api_core.exceptions import Aborted, DeadlineExceeded

from app.adapters.firestore_cases import FirestoreCaseRepository
from app.errors import ApiError
from app.models.cases import CaseRead


def exhausted_abort():
    error = ValueError("Failed to commit transaction in 5 attempts.")
    error.__cause__ = Aborted("Sensitive SDK detail")
    return error


@pytest.fixture
def case(payload):
    return CaseRead(
        id=uuid4().hex, **payload, created_at=datetime.now(UTC), updated_at=datetime.now(UTC)
    )


def repository_with_sdk_result(monkeypatch, outcomes):
    repository = FirestoreCaseRepository.__new__(FirestoreCaseRepository)
    repository.client = Mock()
    invoke = Mock(side_effect=outcomes)
    monkeypatch.setattr("app.adapters.firestore_cases.firestore.transactional", lambda _: invoke)
    monkeypatch.setattr("app.adapters.firestore_cases.sleep", Mock())
    return repository, invoke


def test_aborted_exhaustion_can_restart_without_changing_case_identity(monkeypatch, case):
    repository, invoke = repository_with_sdk_result(monkeypatch, [exhausted_abort(), None])
    assert repository.create("alice", case, 2) is case
    assert invoke.call_count == 2


def test_persistent_contention_is_bounded_and_sanitized(monkeypatch, case):
    repository, invoke = repository_with_sdk_result(
        monkeypatch, [exhausted_abort(), exhausted_abort()]
    )
    with pytest.raises(ApiError) as caught:
        repository.create("alice", case, 2)
    assert invoke.call_count == 2
    assert caught.value.status == 503
    assert caught.value.code == "STORAGE_CONTENTION"
    assert caught.value.retryable
    assert "Sensitive SDK detail" not in caught.value.message


def test_ambiguous_timeout_does_not_automatically_repeat_write(monkeypatch, case):
    repository, invoke = repository_with_sdk_result(
        monkeypatch, [DeadlineExceeded("unknown commit")]
    )
    with pytest.raises(ApiError) as caught:
        repository.create("alice", case, 2)
    assert invoke.call_count == 1
    assert caught.value.status == 503


def test_real_quota_rejection_is_preserved(monkeypatch, case):
    repository, invoke = repository_with_sdk_result(
        monkeypatch, [ApiError(429, "CASE_LIMIT_REACHED", "Case limit reached.")]
    )
    with pytest.raises(ApiError) as caught:
        repository.create("alice", case, 2)
    assert invoke.call_count == 1
    assert caught.value.status == 429
