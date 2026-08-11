"""
PFOR API — Strategy Generation Endpoints
Accepts a business problem, runs the multi-agent pipeline,
persists the result, and returns the structured report.
"""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from pfor.api.auth import get_user_from_token
from pfor.core.agents import MultiAgentPipeline
from pfor.core.config import get_settings
from pfor.db.database import get_db
from pfor.db.models import StrategyReport, User
from pfor.schemas.strategy import StrategyListResponse, StrategyRequest, StrategyReportResponse

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/strategy", tags=["Strategy"])

# Shared pipeline instance (api_key read once at startup)
_pipeline = MultiAgentPipeline(api_key=settings.gemini_api_key)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _optional_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Attempt to resolve the current user from an optional Bearer token.
    Returns None if the token is absent or invalid (anonymous is allowed).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return get_user_from_token(token, db)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/generate",
    response_model=StrategyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a strategic report via the multi-agent pipeline",
)
async def generate_strategy(
    payload: StrategyRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_user),
):
    """
    Run the four-agent AI pipeline (Director → Marketer → Financier → Editor)
    on the given business problem and return the resulting structured report.

    Authentication is optional — anonymous users can generate reports without
    an account; authenticated users have their reports linked to their profile.
    """
    user_id = current_user.id if current_user else None
    logger.info(
        "Strategy generation requested by user_id=%s | problem='%.80s...'",
        user_id,
        payload.problem_statement,
    )

    # Run the agent pipeline
    report_text = await _pipeline.run(payload.problem_statement)

    # Persist to database
    report = StrategyReport(
        user_id=user_id,
        problem_statement=payload.problem_statement,
        result_report=report_text,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    logger.info("Report id=%s saved successfully.", report.id)
    return StrategyReportResponse.model_validate(report)


@router.get(
    "/reports",
    response_model=StrategyListResponse,
    summary="List strategy reports for the authenticated user",
)
def list_reports(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_user),
):
    """
    Return a paginated list of strategy reports.
    - Authenticated users see only their own reports.
    - Unauthenticated requests receive an empty list.
    """
    if current_user is None:
        return StrategyListResponse(total=0, reports=[])

    query = db.query(StrategyReport).filter(StrategyReport.user_id == current_user.id)
    total = query.count()
    reports = (
        query.order_by(StrategyReport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return StrategyListResponse(
        total=total,
        reports=[StrategyReportResponse.model_validate(r) for r in reports],
    )


@router.get(
    "/reports/{report_id}",
    response_model=StrategyReportResponse,
    summary="Get a specific strategy report by ID",
)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_user),
):
    """
    Return a single strategy report.
    Users can only access their own reports; anonymous reports (user_id=None)
    are accessible without authentication.
    """
    report = db.query(StrategyReport).filter(StrategyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with id={report_id} not found.",
        )

    # Access control: private report requires matching user
    if report.user_id is not None:
        if current_user is None or current_user.id != report.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this report.",
            )

    return StrategyReportResponse.model_validate(report)
