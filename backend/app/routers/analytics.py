from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import Response
from typing import Literal
from datetime import date, timedelta
from fastapi import Query
from app.db.client import supabase
from app.core.identity import require_teacher
from app.core.response_cache import cache_response
from app.models.auth_schema import SuccessResponse
import csv
import io

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/classes/{class_id}/export")
def export_attendance(
    class_id: str,
    format: Literal["csv", "xlsx"] = "csv",
    from_date: str | None = None,
    to_date: str | None = None,
    identity=Depends(require_teacher),
):
    teacher_id = identity["user_id"]
    cls = supabase.table("classes").select("code").eq("class_id", class_id).eq("teacher_id", teacher_id).execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Class not found")
    class_code = cls.data[0]["code"]

    # Get sessions
    sessions_query = supabase.table("attendance_sessions").select("session_id,started_at,room_number,status").eq("class_id", class_id)
    if from_date:
        sessions_query = sessions_query.gte("started_at", from_date)
    if to_date:
        sessions_query = sessions_query.lte("started_at", to_date)
    sessions = sessions_query.order("started_at").execute()

    # Get all students in class
    enrollments = supabase.table("class_enrollments").select("student_id").eq("class_id", class_id).execute()
    student_ids = [e["student_id"] for e in enrollments.data] if enrollments.data else []

    students = {}
    for sid in student_ids:
        s = supabase.table("students").select("student_id,prn,name").eq("student_id", sid).execute()
        if s.data:
            students[sid] = s.data[0]

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    header = ["PRN", "Name"] + [s["started_at"][:10] for s in (sessions.data or [])]
    writer.writerow(header)

    # Rows
    for sid, s in students.items():
        row = [s["prn"], s["name"]]
        for session in sessions.data or []:
            record = supabase.table("attendance_records").select("status").eq("session_id", session["session_id"]).eq("student_id", sid).execute()
            status_val = record.data[0]["status"] if record.data else "absent"
            row.append(status_val)
        writer.writerow(row)

    csv_content = output.getvalue()

    if format == "xlsx":
        raise HTTPException(status_code=501, detail="Excel export is not available yet; use CSV")
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="attendance_{class_code}.csv"'},
    )


def class_stats_seed(class_rows, enrollment_counts):
    return {str(row["class_id"]): {"class_id": row["class_id"], "class_name": row["name"], "class_code": row["code"], "sessions": 0, "students": enrollment_counts[str(row["class_id"])], "present": 0, "late": 0, "absent": 0} for row in class_rows}


@router.get("/dashboard/attendance", response_model=SuccessResponse)
@cache_response
def get_attendance_analytics(
    days: int = Query(30, ge=7, le=90),
    identity=Depends(require_teacher),
):
    """Return bounded daily and status aggregates for this teacher's classes."""
    teacher_id = identity["user_id"]
    start_date = (date.today() - timedelta(days=days - 1)).isoformat()
    classes = supabase.table("classes").select("class_id,name,code").eq("teacher_id", teacher_id).execute()
    class_rows = classes.data or []
    class_ids = [row["class_id"] for row in class_rows]
    if not class_ids:
        return SuccessResponse(data={"days": days, "daily": [], "statuses": [], "classes": []})

    enrollment_counts = {}
    for cls in class_rows:
        result = supabase.table("class_enrollments").select("enrollment_id", count="exact").eq("class_id", cls["class_id"]).execute()
        enrollment_counts[str(cls["class_id"])] = result.count or 0

    session_rows = supabase.table("attendance_sessions").select("session_id,class_id,started_at").in_("class_id", class_ids).eq("status", "closed").gte("started_at", start_date).order("started_at").execute().data or []
    session_ids = [row["session_id"] for row in session_rows]
    if not session_ids:
        empty_stats = class_stats_seed(class_rows, enrollment_counts)
        return SuccessResponse(data={"days": days, "daily": [], "statuses": [], "classes": list(empty_stats.values())})
    records = supabase.table("attendance_records").select("session_id,status").in_("session_id", session_ids).execute().data or []
    session_by_id = {str(row["session_id"]): row for row in session_rows}
    # Closed session opportunities provide the denominator, including implicit absences.
    class_stats = class_stats_seed(class_rows, enrollment_counts)
    daily = {}
    statuses = {"present": 0, "late": 0, "absent": 0}
    for session in session_rows:
        day = str(session["started_at"])[:10]
        stats = class_stats[str(session["class_id"])]
        stats["sessions"] += 1
        bucket = daily.setdefault(day, {"date": day, "opportunities": 0, "present": 0, "late": 0, "absent": 0})
        opportunities = enrollment_counts[str(session["class_id"])]
        bucket["opportunities"] += opportunities

    for record in records:
        session = session_by_id.get(str(record["session_id"]))
        if not session:
            continue
        status_value = record.get("status")
        if status_value not in {"present", "late", "absent"}:
            continue
        day = str(session["started_at"])[:10]
        statuses[status_value] += 1
        daily[day][status_value] += 1
        class_stats[str(session["class_id"])][status_value] += 1

    daily_rows = []
    total_opportunities = 0
    for bucket in sorted(daily.values(), key=lambda row: row["date"]):
        attended = bucket["present"] + bucket["late"]
        bucket["attendance_rate"] = round(attended / bucket["opportunities"] * 100, 1) if bucket["opportunities"] else 0.0
        bucket["absent"] = max(0, bucket["opportunities"] - attended)
        total_opportunities += bucket["opportunities"]
        daily_rows.append(bucket)
    for stat in class_stats.values():
        opportunities = stat["sessions"] * stat["students"]
        stat["absent"] = max(0, opportunities - stat["present"] - stat["late"])
        stat["attendance_rate"] = round((stat["present"] + stat["late"]) / opportunities * 100, 1) if opportunities else 0.0
    statuses["absent"] = max(0, total_opportunities - statuses["present"] - statuses["late"])

    return SuccessResponse(data={"days": days, "daily": daily_rows, "statuses": [{"status": key, "count": value} for key, value in statuses.items()], "classes": list(class_stats.values())})


@router.get("/dashboard/stats", response_model=SuccessResponse)
@cache_response
def get_dashboard_stats(identity=Depends(require_teacher)):
    teacher_id = identity["user_id"]
    # Total classes
    classes = supabase.table("classes").select("class_id", count="exact").eq("teacher_id", teacher_id).execute()
    total_classes = classes.count or 0

    # Today's sessions
    from datetime import datetime, timedelta
    today = datetime.now().date().isoformat()
    sessions = supabase.table("attendance_sessions").select("session_id", count="exact").eq("teacher_id", teacher_id).gte("started_at", today).execute()
    today_sessions = sessions.count or 0

    # Overall attendance rate (last 30 days)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    recent_sessions = supabase.table("attendance_sessions").select("session_id").eq("teacher_id", teacher_id).gte("started_at", thirty_days_ago).execute()
    session_ids = [s["session_id"] for s in recent_sessions.data] if recent_sessions.data else []

    if session_ids:
        total_records = supabase.table("attendance_records").select("record_id", count="exact").in_("session_id", session_ids).execute()
        present_records = supabase.table("attendance_records").select("record_id", count="exact").in_("session_id", session_ids).eq("status", "present").execute()
        total = total_records.count or 0
        present = present_records.count or 0
        attendance_rate = (present / total * 100) if total > 0 else 0
    else:
        attendance_rate = 0

    return SuccessResponse(data={
        "total_classes": total_classes,
        "today_sessions": today_sessions,
        "attendance_rate": round(attendance_rate, 1)
    })