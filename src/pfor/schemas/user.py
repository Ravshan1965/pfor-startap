"""
PFOR Pydantic Schemas — User
Validation models for registration, login, and user responses.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserRegisterRequest(BaseModel):
    """Payload for POST /api/auth/register."""

    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v


class UserLoginRequest(BaseModel):
    """Payload for POST /api/auth/login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user representation returned by the API."""

    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token response after successful login or registration."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
