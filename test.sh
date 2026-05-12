#!/usr/bin/env bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FAILED=0

info() { echo "[TEST] $*"; }
pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*"; FAILED=$((FAILED + 1)); }
warn() { echo "[WARN] $*"; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    fail "Docker Compose is not installed."
    return 1
  fi
}

check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    pass "$1 is available"
  else
    fail "$1 is missing"
  fi
}

check_http() {
  local label="$1"
  local url="$2"
  local expected="${3:-}"
  local response

  response="$(curl -fsS "$url" 2>/dev/null)"
  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    fail "$label is not reachable at $url"
    return
  fi

  if [[ -n "$expected" && "$response" != *"$expected"* ]]; then
    fail "$label responded, but did not include expected text: $expected"
    return
  fi

  pass "$label is reachable"
}

check_post_small_talk() {
  local response
  response="$(
    curl -fsS -X POST "http://localhost:8000/api/execute" \
      -H "Content-Type: application/json" \
      -d '{"goal":"how are u"}' 2>/dev/null
  )"
  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    fail "Small-talk API request failed"
    return
  fi

  if [[ "$response" == *'"intent":"small_talk"'* || "$response" == *'"intent": "small_talk"'* ]]; then
    pass "Small-talk request is classified correctly"
  else
    fail "Small-talk request was not classified as small_talk"
    echo "$response"
  fi
}

echo "Testing Human-AI Collaboration app"
echo "=================================="

check_command docker
check_command curl

if docker info >/dev/null 2>&1; then
  pass "Docker is running"
else
  fail "Docker is not running"
fi

info "Validating Docker Compose configuration"
if compose config --quiet; then
  pass "docker-compose.yml is valid"
else
  fail "docker-compose.yml is invalid"
fi

info "Container status"
compose ps || fail "Could not read Docker Compose status"

info "Checking HTTP endpoints"
check_http "Frontend" "http://localhost:3000" "<div"
check_http "Gateway API" "http://localhost:8000/api/health" "healthy"
check_http "Orchestrator" "http://localhost:8001/health" "healthy"
check_http "Task service" "http://localhost:8002/health" "healthy"
check_http "KPI endpoint" "http://localhost:8000/api/kpis" "total_tasks"

info "Checking workflow behavior"
check_post_small_talk

echo
if [[ $FAILED -eq 0 ]]; then
  pass "All checks passed."
  echo "Open the app at http://localhost:3000"
  exit 0
fi

echo "[FAIL] $FAILED check(s) failed."
echo "Helpful commands:"
echo "  docker compose ps"
echo "  docker compose logs --tail=120 gateway_service"
echo "  docker compose logs --tail=120 orchestrator_service"
echo "  docker compose logs --tail=120 task_service"
exit 1
