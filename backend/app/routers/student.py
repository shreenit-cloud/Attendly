from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token, create_access_token
from app.core.response_cache import cache_response
from app.db.client import supabase
from app.models.auth_schema import SuccessResponse
from app.pipeline.face_pipeline import get_face_embedding
from app.pipeline.validator import validate_detection, validate_match
import numpy as np
from PIL import Image
import io
from fastapi import Query

router = APIRouter(prefix="/student", tags=["student"])
bearer = HTTPBearer()


def require_student(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("role") != "student" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return payload["sub"]


@router.get("/attendance/summary", response_model=SuccessResponse)
@cache_response
def get_attendance_summary(student_id: str = Depends(require_student)):
    # Get all enrollments
    enrollments = supabase.table("class_enrollments").select("class_id").eq("student_id", student_id).execute()

    subject_breakdown = []
    total_attended = 0
    total_classes = 0

    for e in enrollments.data or []:
        class_id = e["class_id"]

        # Get class info
        cls = supabase.table("classes").select("name,code").eq("class_id", class_id).execute()
        if not cls.data:
            continue

        # Get total sessions for this class
        sessions = supabase.table("attendance_sessions").select("session_id", count="exact").eq("class_id", class_id).eq("status", "closed").execute()
        total = sessions.count or 0

        # Get attended sessions
        session_ids = [s["session_id"] for s in sessions.data or []]
        attended = supabase.table("attendance_records").select("record_id", count="exact").eq("student_id", student_id).eq("status", "present").in_("session_id", session_ids).execute() if session_ids else None
        present = attended.count or 0 if attended else 0

        percentage = (present / total * 100) if total > 0 else 0

        subject_breakdown.append({
            "class_id": class_id,
            "class_name": cls.data[0]["name"],
            "code": cls.data[0]["code"],
            "attended": present,
            "total": total,
            "percentage": round(percentage, 1),
            "status": "safe" if percentage >= 75 else "low_warning"
        })

        total_attended += present
        total_classes += total

    overall_pct = (total_attended / total_classes * 100) if total_classes > 0 else 0

    return SuccessResponse(data={
        "overall_percentage": round(overall_pct, 1),
        "total_classes": total_classes,
        "attended_classes": total_attended,
        "subject_breakdown": subject_breakdown
    })


@router.get("/attendance/history", response_model=SuccessResponse)
@cache_response
def get_attendance_history(
    class_id: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    student_id: str = Depends(require_student),
):
    enrollments = supabase.table("class_enrollments").select("class_id").eq("student_id", student_id).execute()
    class_ids = list(dict.fromkeys(row["class_id"] for row in (enrollments.data or [])))
    if class_id is not None:
        if class_id not in [str(value) for value in class_ids] and class_id not in class_ids:
            raise HTTPException(status_code=404, detail="Class not found")
        class_ids = [next(value for value in class_ids if str(value) == str(class_id))]
    if not class_ids:
        return SuccessResponse(data={"items": [], "limit": limit, "offset": offset})

    sessions = supabase.table("attendance_sessions").select("session_id,class_id,started_at,room_number").in_("class_id", class_ids).eq("status", "closed").order("started_at", desc=True).order("session_id", desc=True).range(offset, offset + limit - 1).execute()
    session_rows = sessions.data or []
    session_ids = [row["session_id"] for row in session_rows]
    class_rows = supabase.table("classes").select("class_id,name,code").in_("class_id", class_ids).execute()
    class_by_id = {str(row["class_id"]): row for row in class_rows.data or []}
    record_rows = supabase.table("attendance_records").select("session_id,status,method,marked_at").eq("student_id", student_id).in_("session_id", session_ids).execute() if session_ids else None
    record_by_session = {str(row["session_id"]): row for row in (record_rows.data or [])} if record_rows else {}
    items = []
    for session in session_rows:
        cls = class_by_id.get(str(session["class_id"]), {})
        row = record_by_session.get(str(session["session_id"]), {})
        items.append({
            "session_id": session["session_id"],
            "class_id": session["class_id"],
            "class_name": cls.get("name", "Unknown class"),
            "class_code": cls.get("code", ""),
            "started_at": session["started_at"],
            "room_number": session.get("room_number"),
            "status": row.get("status", "absent"),
            "method": row.get("method"),
            "marked_at": row.get("marked_at"),
        })
    return SuccessResponse(data={"items": items, "limit": limit, "offset": offset})


@router.post("/attendance/login-face")
async def face_login(face_image: UploadFile = File(...)):
    # Read and process image
    try:
        image_data = await face_image.read()
        image_np = np.array(Image.open(io.BytesIO(image_data)).convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    faces_data = get_face_embedding(image_np)
    if len(faces_data) != 1:
        raise HTTPException(status_code=401, detail="Image must contain exactly one face")

    embedding, det_score = faces_data[0]
    if not validate_detection(det_score):
        raise HTTPException(status_code=401, detail="Face quality too low")

    # Search all students with embeddings
    students = supabase.table("students").select("student_id,prn,name,face_embedding").not_.is_("face_embedding", "null").execute()

    best_match = None
    best_similarity = 0

    for s in students.data or []:
        if not s.get("face_embedding"):
            continue

        stored_emb = np.array(s["face_embedding"], dtype=np.float32)
        similarity = float(np.dot(embedding, stored_emb))

        if similarity > best_similarity and validate_match(similarity):
            best_similarity = similarity
            best_match = s

    if not best_match:
        raise HTTPException(status_code=401, detail="Face not recognized")

    # Create token
    from app.core.security import create_access_token
    token = create_access_token({"sub": best_match["student_id"], "role": "student"})

    return SuccessResponse(data={
        "access_token": token,
        "token_type": "bearer",
        "similarity_score": best_similarity,
        "user": {
            "id": best_match["student_id"],
            "prn": best_match["prn"],
            "name": best_match["name"],
            "role": "student"
        }
    })