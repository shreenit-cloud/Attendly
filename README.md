# AI Attendance

An AI-assisted classroom attendance web app. Teachers create classes, enroll students, start an attendance session, and use a live camera kiosk to recognize enrolled students. Students can register with a face image, sign in, and view their attendance history. The app includes teacher and student dashboards backed by a FastAPI API and Supabase database.

> **Project status:** This repository does not include the initial SQL that creates all core Supabase tables or their RLS policies. An existing Supabase project with the expected schema is required; the included migrations alone do not initialize a fresh database. Review the limitations and security notes below before using this with real student data.

## Contents

- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Features](#features)
- [Routes and API](#routes-and-api)
- [Data model](#data-model)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Run the app](#run-the-app)
- [Tests and build](#tests-and-build)
- [Database migrations](#database-migrations)
- [Security, privacy, and limitations](#security-privacy-and-limitations)
- [Troubleshooting](#troubleshooting)

## How it works

### Student registration and sign-in

1. A student registers with their name, 10-digit PRN, password, and a camera image.
2. The API checks that exactly one sufficiently clear face is detected, generates a face embedding, hashes the password with bcrypt, and stores the student record and embedding in Supabase.
3. Students can sign in with PRN and password. The app also exposes a face-login API that compares a submitted face against stored student embeddings.
4. Successful authentication returns a signed JWT. The frontend stores it in browser `localStorage` and sends it as a bearer token for protected API requests.

### Teacher and class setup

1. A teacher registers with name, email, and password, then signs in to receive a JWT.
2. The teacher creates a class and can enroll students by student ID.
3. Class-specific operations check that the requesting teacher owns the class/session.

### Live attendance

1. A teacher opens the live kiosk for a class and starts an attendance session.
2. The browser requests camera access and sends captured frames to the API while the kiosk is running.
3. The API loads the session's enrolled students, computes embeddings for detected faces, compares them with enrolled student embeddings, and inserts a `present` attendance record when a match passes the configured threshold.
4. Already-marked students are not inserted again for the same session. A teacher can manually mark a student and close the session.
5. Dashboards and attendance history read the stored sessions and records.

Face matching is an aid to attendance marking, not proof of identity. The current implementation has no liveness or anti-spoofing check.

## Architecture

```text
React + Vite browser app
  ├── Teacher and student pages
  ├── Camera capture in the teacher kiosk
  └── HTTP API calls with bearer JWT
          │
          ▼
FastAPI backend (/api/v1)
  ├── Authentication and role checks
  ├── InsightFace / ONNX face detection and embeddings
  └── Supabase Python client (server-side service-role key)
          │
          ▼
Supabase PostgreSQL
  ├── teachers, students, classes
  └── enrollments, sessions, attendance records
```

- Backend entry point: `backend/app/main.py`.
- Backend configuration: `backend/app/config.py`.
- HTTP endpoints: `backend/app/routers/`.
- Face processing: `backend/app/pipeline/face_pipeline.py`.
- React routes: `frontend/src/App.tsx`.
- Frontend API clients: `frontend/src/api/`.

## Features

- Teacher registration and login.
- Student registration with face image and PRN/password login.
- Teacher class creation and student enrollment/roster.
- Live teacher attendance kiosk with face recognition and manual marking.
- Student attendance summary and history.
- Teacher dashboard analytics and CSV attendance export.
- API documentation from FastAPI at `/docs` when the backend is running.

## Routes and API

All HTTP API routes use the `/api/v1` prefix. The backend exposes interactive OpenAPI documentation at `http://localhost:8000/docs`.

### Web application

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login` | Teacher login |
| `/student-login` | Student login |
| `/teacher/register` | Teacher registration |
| `/student-register` | Student registration |
| `/teacher/*` | Teacher dashboard and class pages |
| `/teacher/classes/new` | Create a class |
| `/teacher/classes/:classId/roster` | Class roster |
| `/teacher/kiosk/:classId` | Live attendance kiosk |
| `/student/*` | Student dashboard and attendance views |

Teacher and student pages have a frontend role gate. The backend also checks roles on protected endpoints; frontend route checks are not a substitute for server authorization.

### HTTP API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/teacher/register` | Register a teacher |
| `POST` | `/auth/teacher/login` | Teacher email/password login |
| `POST` | `/auth/student/register` | Register a student with multipart face image |
| `POST` | `/auth/student/login-prn` | Student PRN/password login |
| `GET` | `/auth/me` | Get current authenticated account |
| `GET` | `/classes` | List classes available to the teacher |
| `POST` | `/classes` | Create a class |
| `POST` | `/classes/{class_id}/enroll` | Enroll students in a class |
| `GET` | `/classes/{class_id}/roster` | Get a class roster |
| `POST` | `/attendance/sessions/start` | Start a class attendance session |
| `POST` | `/attendance/sessions/{session_id}/recognize-frame` | Submit a camera frame for recognition |
| `POST` | `/attendance/sessions/{session_id}/manual-mark` | Manually mark attendance |
| `POST` | `/attendance/sessions/{session_id}/close` | Close a session |
| `GET` | `/student/attendance/summary` | Get the signed-in student's summary |
| `GET` | `/student/attendance/history` | Get the signed-in student's history |
| `POST` | `/student/attendance/login-face` | Face-based student login (currently not role-protected) |
| `GET` | `/analytics/classes/{class_id}/export` | Export attendance; CSV is supported, XLSX is not implemented |
| `GET` | `/analytics/dashboard/attendance?days=...` | Dashboard attendance time series |
| `GET` | `/analytics/dashboard/stats` | Dashboard summary statistics |

Protected calls use `Authorization: Bearer <JWT>`. Registration/login endpoints return the application's success/data/message response envelope. See the route code or `/docs` for request/response schemas and current validation rules.

### WebSocket

The backend has a `/ws/attendance/{session_id}` WebSocket endpoint. It accepts a JWT through the `token` query parameter and currently provides an acknowledgement/echo placeholder; it is **not** the kiosk's live attendance event stream. The current kiosk uses HTTP requests for frame recognition.

## Data model

The backend expects these core Supabase tables and relationships:

| Table | Purpose |
| --- | --- |
| `teachers` | Teacher accounts and password hashes |
| `students` | Student PRNs, password hashes, and face embeddings |
| `classes` | Classes owned by teachers |
| `class_enrollments` | Student-to-class membership |
| `attendance_sessions` | Class attendance sessions opened by teachers |
| `attendance_records` | Student attendance results for a session |

Important relationships: classes belong to teachers; enrollments connect students and classes; sessions belong to classes and teachers; attendance records refer to a session and student. Primary/foreign key and column details are read by the backend code, but this repository does not contain a complete baseline schema migration. The table descriptions above are not a replacement for verified database DDL.

## Requirements

- Python 3.11 or later recommended.
- Node.js 18 or later and npm.
- A Supabase project with the required tables and access configured.
- Camera access in the browser for student face registration and the live teacher kiosk.
- Platform-compatible InsightFace and ONNX Runtime dependencies. Model download/runtime behavior depends on the environment.

## Local setup

Commands below assume the repository root as the current directory unless a `cd` is shown.

### 1. Backend environment

Create and activate a virtual environment, then install backend dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

The face-recognition packages can have platform-specific installation/runtime requirements. The API attempts to load its face model at startup; if model initialization fails, the API may start but face features will not work.

### 2. Backend secrets

Create `backend/.env` (do not commit it):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

The backend is started with `backend/` as its working directory, and settings load `.env` relative to that directory.

### 3. Frontend dependencies and environment

```bash
cd frontend
npm ci
cp .env.example .env
cd ..
```

The example file sets the local HTTP API and WebSocket base URLs. The current frontend uses the HTTP API; the WebSocket endpoint remains a placeholder.

### 4. Supabase database

Set up the core tables and required policies in Supabase before using the app. This repository does not provide a complete clean-install schema or policy set, so do not assume a blank Supabase project is ready after applying the included migrations. Inspect the migration SQL and confirm it matches your database before applying it.

## Configuration

### Backend

The following settings are read by `backend/app/config.py`. Required values must be set in `backend/.env` or the process environment.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Server-only Supabase service-role key |
| `JWT_SECRET` | Yes | — | Secret used to sign application JWTs |
| `ENVIRONMENT` | No | `development` | Runtime environment label |
| `PORT` | No | `8000` | Configured application port |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Application token lifetime |
| `FACE_MATCH_THRESHOLD` | No | `0.50` | Minimum face similarity accepted as a match |
| `MIN_DETECTION_SCORE` | No | `0.50` | Minimum face detector confidence accepted |
| `EXECUTION_PROVIDER` | No | `CPUExecutionProvider` | ONNX Runtime provider preference |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Allowed browser origins, configured as a list |

Use a long, unique `JWT_SECRET`. Never place the service-role key in `frontend/.env`, frontend source, or any publicly exposed client configuration.

### Frontend

| Variable | Example | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | API base URL used by the frontend HTTP client |
| `VITE_WS_BASE_URL` | `ws://localhost:8000/ws` | WebSocket base URL example; WebSocket is not currently used for kiosk events |

Vite embeds `VITE_*` values into client-side assets. Treat them as public; never put secrets there.

## Run the app

Open two terminals from the repository root.

Terminal 1 — API:

```bash
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`). FastAPI's interactive API reference is at `http://localhost:8000/docs`; the backend also exposes `/health`.

The convenience script `./start.sh` starts both servers, but requires `.venv` and `frontend/node_modules` to already exist, and binds to `0.0.0.0`. Use the separate commands above when you want to control local-only binding and see each process independently.

## Tests and build

Backend tests:

```bash
cd backend
../.venv/bin/python -m pytest
```

Frontend production build:

```bash
cd frontend
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

There is no frontend test script currently. The included face-match sample test uses a small synthetic fixture; it is not a real-world recognition accuracy or bias evaluation. Run these checks in your environment before publishing changes.

## Database migrations

SQL files are in `backend/migrations/`. They concern organization-tenancy changes, including adding and later removing organization-related structures; they do not create all six core attendance tables. They are not a substitute for a fresh-install schema. Read each migration and verify its assumptions against a backup or a disposable database before applying it to any database with data. In particular, do not blindly run a migration on production.

## Security, privacy, and limitations

- The backend connects to Supabase using a **service-role key**, which bypasses normal row-level security enforcement for that connection. Keep the key server-side and ensure application authorization checks remain correct.
- Passwords are hashed with bcrypt. Application access tokens are JWTs; the frontend stores them in browser `localStorage`.
- Face embeddings are biometric data. Obtain appropriate consent, restrict database access, use TLS in deployment, define retention/deletion procedures, and follow applicable privacy laws before collecting real users' data.
- Face detection confidence is not liveness detection. Photos or screens may be accepted; the current app does not claim to prevent spoofing.
- Student face login compares against all stored student embeddings, not only students in a selected class.
- The current implementation uses simple matching and per-student database reads during frame recognition; larger classes may need optimized bulk queries and performance work.
- The returned face box is currently a placeholder, not the model's actual detected bounding box.
- The WebSocket endpoint is an acknowledgement placeholder; kiosk frame processing currently uses HTTP.
- XLSX export is not implemented; request CSV instead.
- No complete base-schema SQL or Supabase RLS policy definitions are included. Confirm the actual database schema and policies independently.
- This is a development project, not a claim of production readiness. Review authentication, authorization, privacy, scaling, monitoring, and accessibility before deployment.

## Troubleshooting

- **Backend reports missing settings:** Confirm `backend/.env` exists and contains `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`; launch Uvicorn from `backend/`.
- **Face features fail but API starts:** Check InsightFace/ONNX Runtime platform support, model availability, and the configured execution provider. Review backend startup logs.
- **Browser cannot access the camera:** Grant camera permission and use localhost or HTTPS. Check that no other process is holding the camera.
- **Browser API calls fail:** Confirm the backend is listening on port 8000 and `VITE_API_BASE_URL` matches; verify `CORS_ORIGINS` includes the frontend origin.
- **Database relation/column errors:** The database may not match the schema expected by the backend. Verify the required tables, columns, keys, and policies; the included migrations do not install the core schema.

## Contributing

Use a feature branch for changes. Do not commit `.env` files, service-role keys, JWT secrets, local virtual environments, `node_modules`, Python bytecode, or generated frontend build files. Run backend tests and the frontend build before opening a pull request.
