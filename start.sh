#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BUILD=true
FOLLOW_LOGS=false
TIMEOUT_SECONDS=180
USING_LOCAL_DB=false
COMPOSE_PROFILE_ARGS=()

usage() {
  cat <<'USAGE'
Usage: ./start.sh [options]

Start the Human-AI Collaboration app with Docker Compose.

Options:
  --no-build          Start existing images without rebuilding.
  --logs              Follow container logs after startup.
  --timeout SECONDS   Max seconds to wait for health checks. Default: 180.
  -h, --help          Show this help message.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build)
      BUILD=false
      shift
      ;;
    --logs)
      FOLLOW_LOGS=true
      shift
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:-180}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

info() { echo "[INFO] $*"; }
success() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
error() { echo "[ERROR] $*" >&2; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    error "Docker Compose is not installed. Install Docker Desktop or Docker Compose v2."
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "$1 is required but was not found in PATH."
    exit 1
  fi
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + TIMEOUT_SECONDS))

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl was not found, skipping HTTP wait for $name."
    return 0
  fi

  info "Waiting for $name at $url"
  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      error "$name did not become ready within ${TIMEOUT_SECONDS}s."
      compose ps
      compose logs --tail=80 "$name" 2>/dev/null || true
      exit 1
    fi
    sleep 2
  done

  success "$name is reachable."
}

require_command docker

if ! docker info >/dev/null 2>&1; then
  error "Docker is not running. Start Docker Desktop, then run this script again."
  exit 1
fi

if [[ ! -f ".env" ]]; then
  warn ".env was not found. Starting the Docker local MongoDB profile."
  warn "For Ollama Cloud, create .env and set OLLAMA_API_KEY and OLLAMA_MODEL."
  USING_LOCAL_DB=true
  COMPOSE_PROFILE_ARGS=(--profile local-db)
elif grep -Eq '^[[:space:]]*MONGO_URI=mongodb://mongodb(:27017)?' .env; then
  info ".env uses the Docker MongoDB service, enabling the local-db profile."
  USING_LOCAL_DB=true
  COMPOSE_PROFILE_ARGS=(--profile local-db)
fi

info "Validating docker-compose.yml"
compose "${COMPOSE_PROFILE_ARGS[@]}" config --quiet

up_args=(up -d)
if [[ "$BUILD" == "true" ]]; then
  up_args+=(--build)
fi

info "Starting services with Docker Compose"
compose "${COMPOSE_PROFILE_ARGS[@]}" "${up_args[@]}"

wait_for_http "task_service" "http://localhost:8002/health"
wait_for_http "orchestrator_service" "http://localhost:8001/health"
wait_for_http "gateway_service" "http://localhost:8000/api/health"
wait_for_http "frontend" "http://localhost:3000"

echo
success "Human-AI Collaboration app is running."
echo "Frontend:      http://localhost:3000"
echo "Gateway API:   http://localhost:8000"
echo "API docs:      http://localhost:8000/docs"
echo "Orchestrator:  http://localhost:8001"
echo "Task service:  http://localhost:8002"
if [[ "$USING_LOCAL_DB" == "true" ]]; then
  echo "MongoDB:       mongodb://localhost:${MONGODB_PORT:-27017}"
else
  echo "MongoDB:       configured from .env"
fi
echo
echo "Useful commands:"
echo "  ./test.sh                 Run health and workflow checks"
echo "  docker compose logs -f    Follow logs"
echo "  ./stop.sh                 Stop the app"

if [[ "$FOLLOW_LOGS" == "true" ]]; then
  compose "${COMPOSE_PROFILE_ARGS[@]}" logs -f --tail=120
fi
