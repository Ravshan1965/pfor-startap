"""
PFOR Database — SQLAlchemy Models
Defines the User and StrategyReport ORM models backed by SQLite.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from pfor.db.database import Base


class User(Base):
    """Registered platform user."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship to reports
    reports = relationship("StrategyReport", back_populates="user", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


class StrategyReport(Base):
    """AI-generated strategic report linked to an optional user."""

    __tablename__ = "strategy_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    problem_statement = Column(Text, nullable=False)
    result_report = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Optional back-reference to user
    user = relationship("User", back_populates="reports")

    def __repr__(self) -> str:
        return f"<StrategyReport id={self.id} user_id={self.user_id}>"
