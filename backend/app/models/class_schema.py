from pydantic import BaseModel
from datetime import datetime


class ClassCreateReq(BaseModel):
    name: str
    code: str
    schedule_description: str | None = None


class ClassResponse(BaseModel):
    id: str
    name: str
    code: str
    total_students: int = 0
    total_sessions: int = 0
    avg_attendance_rate: float = 0.0


class EnrollStudentsReq(BaseModel):
    student_prns: list[str]


class EnrollResponse(BaseModel):
    enrolled_count: int
    already_enrolled: list[str]