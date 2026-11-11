from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class SessionStartReq(BaseModel):
    class_id: str
    room_number: str | None = None


class SessionResponse(BaseModel):
    session_id: str
    class_id: str
    status: Literal["active", "closed", "cancelled"]
    started_at: datetime


class ManualMarkReq(BaseModel):
    student_id: str
    status: Literal["present", "absent", "late", "excused"]
    notes: str | None = None


class RecognizedStudent(BaseModel):
    student_id: str
    name: str
    prn: str
    similarity: float
    bounding_box: list[int]
    already_marked: bool


class UnrecognizedFace(BaseModel):
    bounding_box: list[int]
    detection_score: float


class FrameRecognizeResponse(BaseModel):
    total_faces_detected: int
    recognized_students: list[RecognizedStudent]
    unrecognized_faces: list[UnrecognizedFace]


class SessionCloseResponse(BaseModel):
    session_id: str
    status: Literal["closed"]
    total_enrolled: int
    present_count: int
    absent_count: int
    attendance_percentage: float
