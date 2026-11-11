from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token

bearer = HTTPBearer()


def current_identity(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    role, user_id = payload.get("role"), payload.get("sub")
    if role not in {"teacher", "student"} or not user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"user_id": user_id, "teacher_id": user_id, "student_id": user_id, "role": role}


def require_teacher(identity=Depends(current_identity)):
    if identity["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return identity


def require_student(identity=Depends(current_identity)):
    if identity["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return identity
