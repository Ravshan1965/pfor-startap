"""
PFOR Pydantic Schemas — Strategy
Validation models for strategy report generation and responses.
"""
from datetime import datetime

from pydantic import BaseModel, field_validator


class StrategyRequest(BaseModel):
    """Payload for POST /api/strategy/generate."""

    problem_statement: str

    @field_validator("problem_statement")
    @classmethod
    def problem_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 20:
            raise ValueError(
                "Problem statement must be at least 20 characters long."
            )
        return v


class StrategyReportResponse(BaseModel):
    """Full report representation returned by the API."""

    id: int
    user_id: int | None
    problem_statement: str
    result_report: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StrategyListResponse(BaseModel):
    """Paginated list of strategy reports."""

    total: int
    reports: list[StrategyReportResponse]
