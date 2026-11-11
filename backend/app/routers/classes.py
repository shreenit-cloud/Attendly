from fastapi import APIRouter, HTTPException, status, Depends
from app.db.client import supabase
from app.core.identity import require_teacher
from app.core.response_cache import clear_response_cache
from app.models.auth_schema import SuccessResponse
from app.models.class_schema import ClassCreateReq, ClassResponse, EnrollStudentsReq, EnrollResponse
from typing import Optional

router = APIRouter(prefix="/classes", tags=["classes"])
@router.get("", response_model=SuccessResponse)
def list_classes(identity=Depends(require_teacher)):
    classes = supabase.table("classes").select("*").eq("teacher_id", identity["teacher_id"]).execute()

    result = []
    for cls in classes.data or []:
        # Get enrollment count
        enroll_count = supabase.table("class_enrollments").select("enrollment_id", count="exact").eq("class_id", cls["class_id"]).execute()
        # Get session count
        session_count = supabase.table("attendance_sessions").select("session_id", count="exact").eq("class_id", cls["class_id"]).execute()

        result.append({
            "id": cls["class_id"],
            "name": cls["name"],
            "code": cls["code"],
            "total_students": enroll_count.count or 0,
            "total_sessions": session_count.count or 0,
            "avg_attendance_rate": 0.0  # Calculate from analytics
        })

    return SuccessResponse(data=result)


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def create_class(req: ClassCreateReq, identity=Depends(require_teacher)):
    result = supabase.table("classes").insert({
        "teacher_id": identity["teacher_id"],
        "name": req.name,
        "code": req.code,
        "schedule_description": req.schedule_description
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create class")
    clear_response_cache()

    cls = result.data[0]
    return SuccessResponse(data={
        "id": cls["class_id"],
        "name": cls["name"],
        "code": cls["code"],
        "total_students": 0,
        "total_sessions": 0,
        "avg_attendance_rate": 0.0
    })


@router.post("/{class_id}/enroll", response_model=SuccessResponse)
def enroll_students(class_id: str, req: EnrollStudentsReq, identity=Depends(require_teacher)):
    cls = supabase.table("classes").select("class_id").eq("class_id", class_id).eq("teacher_id", identity["teacher_id"]).execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Class not found")
    enrolled = []
    already_enrolled = []

    for prn in req.student_prns:
        # Find student by PRN
        student = supabase.table("students").select("student_id").eq("prn", prn).execute()
        if not student.data:
            continue

        student_id = student.data[0]["student_id"]

        # Check if already enrolled
        existing = supabase.table("class_enrollments").select("enrollment_id").eq("class_id", class_id).eq("student_id", student_id).execute()
        if existing.data:
            already_enrolled.append(prn)
            continue

        # Enroll student
        supabase.table("class_enrollments").insert({
            "class_id": class_id,
            "student_id": student_id
        }).execute()
        enrolled.append(prn)

    if enrolled:
        clear_response_cache()
    return SuccessResponse(data=EnrollResponse(enrolled_count=len(enrolled), already_enrolled=already_enrolled).model_dump())


@router.get("/{class_id}/roster", response_model=SuccessResponse)
def get_roster(class_id: str, identity=Depends(require_teacher)):
    cls = supabase.table("classes").select("class_id").eq("class_id", class_id).eq("teacher_id", identity["teacher_id"]).execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Class not found")
    enrollments = supabase.table("class_enrollments").select("student_id").eq("class_id", class_id).execute()

    roster = []
    for e in enrollments.data or []:
        student = supabase.table("students").select("student_id,prn,name,face_embedding").eq("student_id", e["student_id"]).execute()
        if student.data:
            s = student.data[0]
            roster.append({
                "student_id": s["student_id"],
                "prn": s["prn"],
                "name": s["name"],
                "face_registered": s.get("face_embedding") is not None
            })

    return SuccessResponse(data=roster)