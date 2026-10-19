#!/usr/bin/env bash
# Runs on the VPS from /opt/kwings-accounts.
#   ./deploy.sh deploy <image-tag>    pull, migrate, switch containers, verify (auto-rollback on failure)
#   ./deploy.sh rollback [image-tag]  switch back to a previous tag (default: the one before current)
#   ./deploy.sh status
# Never removes volumes: PostgreSQL data lives in the "kwings-accounts_pgdata" volume.
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE=(docker compose -f docker-compose.prod.yml)
HISTORY=.deploy-history
set -a
# shellcheck disable=SC1091
source .env
set +a
API_URL="http://127.0.0.1:${API_HOST_PORT:-4010}/api/health"
WEB_URL="http://127.0.0.1:${WEB_HOST_PORT:-3010}/login"

log() { echo "[$(date -u +%FT%TZ)] $*"; }
current_tag() { tail -n 1 "$HISTORY" 2>/dev/null || true; }
previous_tag() { tail -n 2 "$HISTORY" 2>/dev/null | head -n 1; }

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS "$API_URL" >/dev/null && curl -fsS -o /dev/null "$WEB_URL"; then return 0; fi
    sleep 2
  done
  return 1
}

switch_to() {
  export IMAGE_TAG="$1"
  log "Starting api + web at $IMAGE_TAG"
  "${COMPOSE[@]}" up -d --no-deps --remove-orphans api web
}

deploy() {
  local tag="$1" prev
  prev="$(current_tag)"
  export IMAGE_TAG="$tag"
  log "Pulling images $tag"
  "${COMPOSE[@]}" pull api web
  "${COMPOSE[@]}" up -d --wait postgres

  # Migrations run before switching containers; a failure stops here with the old version still serving.
  log "Running migrations"
  "${COMPOSE[@]}" run --rm migrate

  switch_to "$tag"
  if healthy; then
    echo "$tag" >>"$HISTORY"
    log "Deployed $tag"
    docker image prune -f >/dev/null # dangling images only
  else
    log "Health check failed for $tag"
    if [[ -n "$prev" ]]; then
      log "Rolling back to $prev (migrations are backward compatible)"
      switch_to "$prev"
      healthy && log "Rolled back to $prev" || log "Rollback unhealthy too: investigate now"
    fi
    exit 1
  fi
}

rollback() {
  local tag="${1:-$(previous_tag)}"
  [[ -n "$tag" ]] || { log "No previous tag in $HISTORY"; exit 1; }
  switch_to "$tag"
  healthy || { log "Rollback to $tag is unhealthy"; exit 1; }
  echo "$tag" >>"$HISTORY"
  log "Rolled back to $tag"
}

case "${1:-}" in
  deploy) deploy "${2:?usage: deploy.sh deploy <image-tag>}" ;;
  rollback) rollback "${2:-}" ;;
  status)
    echo "Current: $(current_tag)"
    IMAGE_TAG="$(current_tag)" "${COMPOSE[@]}" ps
    ;;
  *) echo "usage: deploy.sh deploy <tag> | rollback [tag] | status" >&2; exit 2 ;;
esac
