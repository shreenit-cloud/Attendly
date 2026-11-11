from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.db.client import supabase
from app.core.security import create_access_token, verify_password, hash_password, decode_token
from app.models.auth_schema import SuccessResponse, TeacherLoginReq, StudentPRNLoginReq, TeacherRegisterReq, StudentRegisterReq
from app.pipeline.face_pipeline import get_face_embedding
from app.pipeline.validator import validate_detection
import numpy as np
from PIL import Image
import io

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


def success(data, message="Operation completed successfully"):
    return SuccessResponse(data=data, message=message)


@router.post("/teacher/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def register_teacher(req: TeacherRegisterReq):
    if supabase.table("teachers").select("teacher_id").eq("email", req.email).execute().data:
        raise HTTPException(status_code=409, detail="Email already registered")
    result = supabase.table("teachers").insert({"name": req.name, "email": req.email, "password_hash": hash_password(req.password)}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Registration failed")
    teacher = result.data[0]
    return success({"teacher_id": teacher["teacher_id"], "name": teacher["name"], "email": teacher["email"], "role": "teacher"})


@router.post("/teacher/login")
def login_teacher(req: TeacherLoginReq):
    result = supabase.table("teachers").select("*").eq("email", req.email).execute()
    if not result.data or not verify_password(req.password, result.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    teacher = result.data[0]
    token = create_access_token({"sub": teacher["teacher_id"], "role": "teacher"})
    return success({"access_token": token, "token_type": "bearer", "expires_in": 3600, "user": {"id": teacher["teacher_id"], "name": teacher["name"], "email": teacher["email"], "role": "teacher"}})


@router.post("/student/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def register_student(name: str = Form(...), prn: str = Form(...), password: str = Form(...), face_image: UploadFile = File(...)):
    if len(prn) != 10 or not prn.isdigit() or len(password) < 8:
        raise HTTPException(status_code=422, detail="Invalid PRN or password")
    if supabase.table("students").select("student_id").eq("prn", prn).execute().data:
        raise HTTPException(status_code=409, detail="PRN already registered")
    try:
        image = np.array(Image.open(io.BytesIO(await face_image.read())).convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")
    faces = get_face_embedding(image)
    if len(faces) != 1 or not validate_detection(faces[0][1]):
        raise HTTPException(status_code=400, detail="A clear face is required")
    result = supabase.table("students").insert({"name": name, "prn": prn, "password_hash": hash_password(password), "face_embedding": faces[0][0].tolist()}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Registration failed")
    student = result.data[0]
    return success({"student_id": student["student_id"], "prn": student["prn"], "name": student["name"], "face_registered": True})


@router.post("/student/login-prn")
def login_student_prn(req: StudentPRNLoginReq):
    result = supabase.table("students").select("*").eq("prn", req.prn).execute()
    if not result.data or not verify_password(req.password, result.data[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    student = result.data[0]
    token = create_access_token({"sub": student["student_id"], "role": "student"})
    return success({"access_token": token, "token_type": "bearer", "user": {"id": student["student_id"], "prn": student["prn"], "name": student["name"], "role": "student"}})


@router.get("/me")
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id, role = payload.get("sub"), payload.get("role")
    if role == "teacher":
        result = supabase.table("teachers").select("teacher_id,name,email").eq("teacher_id", user_id).execute()
        if result.data:
            return success({"user_id": user_id, "role": role, "name": result.data[0]["name"]})
    elif role == "student":
        result = supabase.table("students").select("student_id,prn,name").eq("student_id", user_id).execute()
        if result.data:
            return success({"user_id": user_id, "role": role, "name": result.data[0]["name"], "prn": result.data[0]["prn"]})
    raise HTTPException(status_code=401, detail="Invalid token")
