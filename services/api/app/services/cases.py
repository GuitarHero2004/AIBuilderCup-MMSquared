"""Case operations share owner context and cannot accept an owner from request payloads."""

from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from app.errors import ApiError
from app.models.cases import CaseCreate, CaseRead, valid_case_id
from app.security import Principal


class CaseRepository(Protocol):
    def create(self, owner_uid: str, case: CaseRead, maximum_cases: int) -> CaseRead: ...
    def list_for_owner(self, owner_uid: str) -> list[CaseRead]: ...
    def get(self, owner_uid: str, case_id: str) -> CaseRead | None: ...


class CaseService:
    def __init__(self, repository: CaseRepository, maximum_cases: int = 2):
        self.repository = repository
        self.maximum_cases = maximum_cases

    def create(self, principal: Principal, payload: CaseCreate) -> CaseRead:
        now = datetime.now(UTC)
        case = CaseRead(
            id=uuid4().hex,
            name=payload.name,
            requirement=payload.requirement,
            created_at=now,
            updated_at=now,
        )
        return self.repository.create(principal.uid, case, self.maximum_cases)

    def list(self, principal: Principal) -> list[CaseRead]:
        return self.repository.list_for_owner(principal.uid)

    def get(self, principal: Principal, case_id: str) -> CaseRead:
        case = self.repository.get(principal.uid, case_id) if valid_case_id(case_id) else None
        if case is None:
            raise ApiError(404, "CASE_NOT_FOUND", "This case is not available in your session.")
        return case
