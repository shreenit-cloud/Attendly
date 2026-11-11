from typing import Any

from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.routers import analytics, attendance, auth, classes, student

client = TestClient(app)
DB: dict[str, list[dict[str, Any]]] = {name: [] for name in ("teachers", "students", "classes", "class_enrollments", "attendance_sessions", "attendance_records")}


class Result:
    def __init__(self, data, count=None):
        self.data, self.count = data, count


class Query:
    def __init__(self, table):
        self.table, self.filters, self.operation, self.payload = table, [], "select", None
        self.count = False
        self.page = None

    def select(self, *_args, **kwargs):
        self.count = kwargs.get("count") == "exact"
        return self

    def eq(self, key, value):
        self.filters.append(lambda row: row.get(key) == value)
        return self

    def in_(self, key, values):
        self.filters.append(lambda row: row.get(key) in values or str(row.get(key)) in {str(value) for value in values})
        return self

    def not_(self):
        return self

    def is_(self, key, value):
        self.filters.append(lambda row: (row.get(key) is None) if value == "null" else row.get(key) == value)
        return self

    def gte(self, key, value):
        self.filters.append(lambda row: str(row.get(key, "")) >= value)
        return self

    def lte(self, key, value):
        self.filters.append(lambda row: str(row.get(key, "")) <= value)
        return self

    def order(self, *_args, **_kwargs):
        return self

    def range(self, start, end):
        self.page = (start, end + 1)
        return self

    def insert(self, payload):
        self.operation, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.operation, self.payload = "update", payload
        return self

    def execute(self):
        rows = DB[self.table]
        matches = [r for r in rows if all(f(r) for f in self.filters)]
        if self.operation == "insert":
            row = dict(self.payload)
            key = {"teachers": "teacher_id", "students": "student_id", "classes": "class_id", "class_enrollments": "enrollment_id", "attendance_sessions": "session_id", "attendance_records": "record_id"}[self.table]
            row.setdefault(key, f"{self.table}-{len(rows)+1}")
            row.setdefault("started_at", "2026-11-02T10:00:00")
            rows.append(row)
            matches = [row]
        elif self.operation == "update":
            for row in matches:
                row.update(self.payload)
        if self.page:
            matches = matches[self.page[0]:self.page[1]]
        return Result(matches, len(matches) if self.count else None)


class FakeSupabase:
    def table(self, name):
        return Query(name)


def setup_function():
    from app.core.response_cache import clear_response_cache
    clear_response_cache()
    for rows in DB.values():
        rows.clear()
    fake = FakeSupabase()
    for module in (analytics, attendance, auth, classes, student):
        module.supabase = fake


def test_face_pipeline_converts_rgb_images_to_bgr(monkeypatch):
    import numpy as np
    from app.pipeline import face_pipeline

    image = np.array([[[10, 20, 30]]], dtype=np.uint8)
    captured = {}

    class FakeModel:
        def get(self, pixels):
            captured["pixels"] = pixels
            return []

    monkeypatch.setattr(face_pipeline, "load_face_model", lambda: FakeModel())
    assert face_pipeline.get_face_embedding(image) == []
    assert captured["pixels"].tolist() == [[[30, 20, 10]]]


def test_teacher_and_student_auth_and_api_flow():
    teacher = client.post("/api/v1/auth/teacher/register", json={"name": "Test Teacher", "email": "teacher@example.com", "password": "long-password"})
    assert teacher.status_code == 201, teacher.text
    tlogin = client.post("/api/v1/auth/teacher/login", json={"email": "teacher@example.com", "password": "long-password"})
    assert tlogin.status_code == 200, tlogin.text
    th = {"Authorization": f"Bearer {tlogin.json()['data']['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=th).json()["data"]["role"] == "teacher"
    assert client.get("/api/v1/classes").status_code == 401

    created = client.post("/api/v1/classes", json={"name": "Networks", "code": "CS301"}, headers=th)
    assert created.status_code == 201, created.text
    class_id = created.json()["data"]["id"]

    assert client.post("/api/v1/auth/student/register", data={"name": "Test Student", "prn": "1234567890", "password": "long-password"}).status_code == 201
    slogin = client.post("/api/v1/auth/student/login-prn", json={"prn": "1234567890", "password": "long-password"})
    assert slogin.status_code == 200, slogin.text
    sh = {"Authorization": f"Bearer {slogin.json()['data']['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=sh).json()["data"]["role"] == "student"
    assert client.get("/api/v1/classes", headers=sh).status_code == 403
    assert client.post("/api/v1/auth/student/login-prn", json={"prn": "1234567890", "password": "wrong"}).status_code == 401

    enroll = client.post(f"/api/v1/classes/{class_id}/enroll", json={"student_prns": ["1234567890"]}, headers=th)
    assert enroll.status_code == 200 and enroll.json()["data"]["enrolled_count"] == 1, enroll.text
    session = client.post("/api/v1/attendance/sessions/start", json={"class_id": class_id}, headers=th)
    assert session.status_code == 201, session.text
    session_id = session.json()["data"]["session_id"]

    import io
    import numpy as np
    from PIL import Image
    assert client.post(f"/api/v1/attendance/sessions/{session_id}/manual-mark", json={"student_id": DB["students"][0]["student_id"], "status": "present"}, headers=sh).status_code == 403
    marked = client.post(f"/api/v1/attendance/sessions/{session_id}/manual-mark", json={"student_id": DB["students"][0]["student_id"], "status": "present"}, headers=th)
    assert marked.status_code == 200, marked.text

    closed = client.post(f"/api/v1/attendance/sessions/{session_id}/close", headers=th)
    assert closed.status_code == 200 and closed.json()["data"]["present_count"] == 1, closed.text
    assert DB["attendance_sessions"][0]["status"] == "closed"
    assert DB["attendance_sessions"][0]["closed_at"]
    assert client.get("/api/v1/student/attendance/summary", headers=sh).json()["data"]["attended_classes"] == 1
    history = client.get("/api/v1/student/attendance/history", headers=sh)
    assert history.status_code == 200 and len(history.json()["data"]["items"]) == 1, history.text
    assert history.json()["data"]["items"][0]["status"] == "present"
    assert client.get("/api/v1/student/attendance/history?limit=101", headers=sh).status_code == 422
    analytics_data = client.get("/api/v1/analytics/dashboard/attendance?days=30", headers=th)
    assert analytics_data.status_code == 200, analytics_data.text
    assert client.get("/api/v1/analytics/dashboard/attendance", headers=sh).status_code == 403
    assert client.get("/api/v1/analytics/dashboard/stats", headers=th).status_code == 200


def test_session_endpoints_accept_numeric_database_ids(monkeypatch):
    DB["teachers"].append({"teacher_id": 2, "name": "Test Teacher", "email": "teacher@example.com"})
    DB["classes"].append({"class_id": 1, "teacher_id": 2, "name": "Networks", "code": "CS301"})
    DB["attendance_sessions"].append({"session_id": 8, "class_id": 1, "teacher_id": 2, "status": "active"})
    monkeypatch.setattr(attendance, "supabase", FakeSupabase())
    headers = {"Authorization": f"Bearer {create_access_token({'sub': 2, 'role': 'teacher'})}"}

    import io
    from PIL import Image

    monkeypatch.setattr(attendance, "get_face_embedding", lambda _image: [])
    image = Image.new("RGB", (8, 8), "white")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    recognized = client.post(
        "/api/v1/attendance/sessions/8/recognize-frame",
        files={"frame": ("frame.jpg", buffer.getvalue(), "image/jpeg")},
        headers=headers,
    )
    assert recognized.status_code == 200, recognized.text

    closed = client.post("/api/v1/attendance/sessions/8/close", headers=headers)
    assert closed.status_code == 200, closed.text


def test_registration_validation_and_invalid_face_image():
    assert client.post("/api/v1/auth/teacher/register", json={"name": "x", "email": "bad", "password": "short"}).status_code == 422
    assert client.post("/api/v1/auth/student/register", data={"name": "x", "prn": "abc", "password": "short"}).status_code == 422
    assert client.post("/api/v1/student/attendance/login-face", files={"face_image": ("bad.jpg", b"not an image", "image/jpeg")}).status_code == 400
