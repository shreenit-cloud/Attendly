from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends
from app.db.client import supabase
from app.core.identity import require_teacher
from app.core.response_cache import clear_response_cache
from app.models.auth_schema import SuccessResponse
from app.models.attendance_schema import (
    SessionStartReq, SessionResponse, ManualMarkReq, FrameRecognizeResponse,
    RecognizedStudent, UnrecognizedFace, SessionCloseResponse
)
from app.pipeline.face_pipeline import get_face_embedding, _l2_normalize
from app.pipeline.validator import validate_detection, validate_match
import numpy as np
from PIL import Image
import io
import base64
from datetime import datetime, timezone

router = APIRouter(prefix="/attendance", tags=["attendance"])
@router.post("/sessions/start", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def start_session(req: SessionStartReq, identity=Depends(require_teacher)):
    teacher_id = identity["user_id"]
    cls = supabase.table("classes").select("class_id").eq("class_id", req.class_id).eq("teacher_id", teacher_id).execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Class not found")
    result = supabase.table("attendance_sessions").insert({
        "class_id": req.class_id,
        "teacher_id": teacher_id,
        "room_number": req.room_number,
        "status": "active"
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to start session")
    clear_response_cache()

    session = result.data[0]
    return SuccessResponse(data={
        "session_id": session["session_id"],
        "class_id": session["class_id"],
        "status": session["status"],
        "started_at": session["started_at"]
    })


@router.post("/sessions/{session_id}/recognize-frame")
async def recognize_frame(
    session_id: str,
    frame: UploadFile = File(...),
    identity=Depends(require_teacher),
):
    try:
        image_data = await frame.read()
        image_np = np.array(Image.open(io.BytesIO(image_data)).convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    # Get session info
    session = supabase.table("attendance_sessions").select("*").eq("session_id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session.data[0]["teacher_id"]) != str(identity["user_id"]):
        raise HTTPException(status_code=403, detail="Session access denied")
    if session.data[0]["status"] != "active":
        raise HTTPException(status_code=400, detail="Session is not active")
    faces_data = get_face_embedding(image_np)
    class_id = session.data[0]["class_id"]

    # Get enrolled students for this class
    enrollments = supabase.table("class_enrollments").select("student_id").eq("class_id", class_id).execute()
    enrolled_ids = [e["student_id"] for e in enrollments.data] if enrollments.data else []

    recognized_students = []
    unrecognized_faces = []

    for embedding, det_score in faces_data:
        if not validate_detection(det_score):
            continue

        # Find matching student in enrolled list
        best_match = None
        best_similarity = 0

        for student_id in enrolled_ids:
            student = supabase.table("students").select("student_id,name,prn,face_embedding").eq("student_id", student_id).execute()
            if not student.data or not student.data[0].get("face_embedding"):
                continue

            stored_emb = np.array(student.data[0]["face_embedding"], dtype=np.float32)
            similarity = float(np.dot(embedding, stored_emb))

            if similarity > best_similarity and validate_match(similarity):
                best_similarity = similarity
                best_match = student.data[0]

        if best_match:
            # Check if already marked present
            existing = supabase.table("attendance_records").select("record_id").eq("session_id", session_id).eq("student_id", best_match["student_id"]).execute()
            already_marked = bool(existing.data)

            if not already_marked:
                # Mark attendance
                supabase.table("attendance_records").insert({
                    "session_id": session_id,
                    "student_id": best_match["student_id"],
                    "status": "present",
                    "confidence_score": best_similarity,
                    "method": "face_recognition"
                }).execute()
                clear_response_cache()

            recognized_students.append(RecognizedStudent(
                student_id=str(best_match["student_id"]),
                name=best_match["name"],
                prn=best_match["prn"],
                similarity=best_similarity,
                bounding_box=[0, 0, 200, 200],  # Would need actual bbox from InsightFace
                already_marked=already_marked
            ))
        else:
            unrecognized_faces.append(UnrecognizedFace(
                bounding_box=[0, 0, 200, 200],
                detection_score=det_score
            ))

    return SuccessResponse(data=FrameRecognizeResponse(
        total_faces_detected=len(faces_data),
        recognized_students=recognized_students,
        unrecognized_faces=unrecognized_faces
    ).model_dump())


@router.post("/sessions/{session_id}/manual-mark", response_model=SuccessResponse)
def manual_mark(session_id: str, req: ManualMarkReq, identity=Depends(require_teacher)):
    session = supabase.table("attendance_sessions").select("teacher_id,class_id,status").eq("session_id", session_id).execute()
    if not session.data or str(session.data[0]["teacher_id"]) != str(identity["teacher_id"]):
        raise HTTPException(status_code=404, detail="Session not found")
    if session.data[0].get("status") != "active":
        raise HTTPException(status_code=400, detail="Session is not active")
    enrolled = supabase.table("class_enrollments").select("enrollment_id").eq("class_id", session.data[0]["class_id"]).eq("student_id", req.student_id).execute()
    student = supabase.table("students").select("student_id").eq("student_id", req.student_id).execute()
    if not enrolled.data or not student.data:
        raise HTTPException(status_code=404, detail="Student is not enrolled in this class")
    # Upsert attendance record
    existing = supabase.table("attendance_records").select("record_id").eq("session_id", session_id).eq("student_id", req.student_id).execute()

    if existing.data:
        supabase.table("attendance_records").update({
            "status": req.status,
            "method": "manual_teacher",
            "notes": req.notes
        }).eq("record_id", existing.data[0]["record_id"]).eq("session_id", session_id).execute()
    else:
        supabase.table("attendance_records").insert({
            "session_id": session_id,
            "student_id": req.student_id,
            "status": req.status,
            "method": "manual_teacher",
            "notes": req.notes
        }).execute()
    clear_response_cache()

    return SuccessResponse(message="Attendance marked successfully")


@router.post("/sessions/{session_id}/close", response_model=SuccessResponse)
def close_session(session_id: str, identity=Depends(require_teacher)):
    # Get session and class info
    session = supabase.table("attendance_sessions").select("*").eq("session_id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session.data[0]["teacher_id"]) != str(identity["user_id"]):
        raise HTTPException(status_code=404, detail="Session not found")
    class_id = session.data[0]["class_id"]

    # Get enrolled count
    enrolled_count = supabase.table("class_enrollments").select("enrollment_id", count="exact").eq("class_id", class_id).execute()
    total_enrolled = enrolled_count.count or 0

    # Get present count
    present_count = supabase.table("attendance_records").select("record_id", count="exact").eq("session_id", session_id).eq("status", "present").execute()
    present = present_count.count or 0

    # Update both fields explicitly; direct Supabase REST updates do not trigger DB defaults.
    supabase.table("attendance_sessions").update({
        "status": "closed",
        "closed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("session_id", session_id).execute()
    clear_response_cache()

    attendance_pct = (present / total_enrolled * 100) if total_enrolled > 0 else 0

    return SuccessResponse(data=SessionCloseResponse(
        session_id=session_id,
        status="closed",
        total_enrolled=total_enrolled,
        present_count=present,
        absent_count=total_enrolled - present,
        attendance_percentage=round(attendance_pct, 1)
    ).model_dump())