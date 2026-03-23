#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-20529}"
BASE_PATH_VALUE="${BASE_PATH_VALUE:-/}"
API_TARGET_VALUE="${API_TARGET_VALUE:-http://127.0.0.1:${API_PORT}}"

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null || true)"

  if [[ -n "${pids}" ]]; then
    echo "Port ${port} is busy, stopping existing process(es): ${pids}"
    kill ${pids} 2>/dev/null || true
    sleep 1
  fi
}

free_port "$API_PORT"
free_port "$WEB_PORT"

echo "Starting API on port ${API_PORT}..."
(
  export PORT="$API_PORT" NODE_ENV=development
  pnpm --filter @workspace/api-server run dev
) &
API_PID=$!

echo "Starting frontend on port ${WEB_PORT}..."
(
  export PORT="$WEB_PORT" BASE_PATH="$BASE_PATH_VALUE" API_TARGET="$API_TARGET_VALUE"
  pnpm --filter @workspace/llm-championship run dev
) &
WEB_PID=$!

cleanup() {
  echo
  echo "Stopping processes..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "App started. Open: http://localhost:${WEB_PORT}"
wait -n "$API_PID" "$WEB_PID"
