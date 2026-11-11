from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.routers import auth, classes, attendance, student, analytics
from app.core.security import decode_token
import json

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load face model
    print("Loading InsightFace model...")
    try:
        from app.pipeline.face_pipeline import load_face_model
        load_face_model()
        print("Face model loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load face model: {e}")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="AI Attendance API",
    description="Facial recognition attendance system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency
async def get_current_user(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return None
    try:
        payload = decode_token(token)
        return {"user_id": payload.get("sub"), "role": payload.get("role")}
    except Exception:
        await websocket.close(code=4001)
        return None


# WebSocket endpoint
@app.websocket("/ws/attendance/{session_id}")
async def websocket_attendance(websocket: WebSocket, session_id: str):
    user = await get_current_user(websocket)
    if not user:
        return

    await websocket.accept()

    # Store connection (in production, use a connection manager)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Echo back for now - in production broadcast to other clients
            await websocket.send_json({
                "event": "ACK",
                "data": {"received": True}
            })

    except WebSocketDisconnect:
        print(f"Client disconnected from session {session_id}")


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(classes.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(student.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "AI Attendance API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}