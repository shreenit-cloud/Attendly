from pydantic import BaseModel, EmailStr
from typing import Literal


# Envelopes
class SuccessResponse(BaseModel):
    success: bool = True
    data: dict | list | None = None
    message: str = "Operation completed successfully"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: str | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


# Auth Schemas
class TeacherRegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str


class TeacherLoginReq(BaseModel):
    email: EmailStr
    password: str


class StudentRegisterReq(BaseModel):
    name: str
    prn: str
    password: str


class StudentPRNLoginReq(BaseModel):
    prn: str
    password: str


class TokenData(BaseModel):
    user_id: str
    role: Literal["teacher", "student"]
    exp: int | None = None


class UserPayload(BaseModel):
    id: str
    prn: str | None = None
    name: str
    email: str | None = None
    role: Literal["teacher", "student"]