#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

if [[ -z "${JWT_SECRET:-}" ]]; then
  unset JWT_SECRET
fi

stop_servers() {
  [[ -z "$FRONTEND_PID" ]] || kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -z "$BACKEND_PID" ]] || kill "$BACKEND_PID" 2>/dev/null || true
}
trap stop_servers EXIT INT TERM

if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Missing backend Python environment: $ROOT/.venv/bin/python" >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run: cd frontend && npm install" >&2
  exit 1
fi

(cd "$ROOT/backend" && "$ROOT/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!
(cd "$ROOT/frontend" && npm run dev -- --host 0.0.0.0) &
FRONTEND_PID=$!

echo "Backend:  http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
wait
