#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REMOVE_VOLUMES=false

usage() {
  cat <<'USAGE'
Usage: ./stop.sh [options]

Stop the Human-AI Collaboration app.

Options:
  --volumes       Also delete Docker volumes, including local MongoDB data.
  -h, --help      Show this help message.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --volumes)
      REMOVE_VOLUMES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

info() { echo "[INFO] $*"; }
success() { echo "[OK] $*"; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "[ERROR] Docker Compose is not installed." >&2
    exit 1
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker is required to stop Docker Compose services." >&2
  exit 1
fi

down_args=(down --remove-orphans)
if [[ "$REMOVE_VOLUMES" == "true" ]]; then
  down_args+=(--volumes)
fi

info "Stopping application containers"
compose "${down_args[@]}"

if [[ -f "docker-compose.dependencies.yml" ]]; then
  info "Stopping optional dependency containers if they exist"
  compose -f docker-compose.dependencies.yml "${down_args[@]}" >/dev/null 2>&1 || true
fi

success "All Docker services are stopped."
if [[ "$REMOVE_VOLUMES" == "true" ]]; then
  echo "Local Docker volumes were removed."
else
  echo "Local Docker volumes were preserved. Use ./stop.sh --volumes to delete them."
fi
