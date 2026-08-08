#!/usr/bin/env bash
#
# The VPS deploys itself. Run from cron; no inbound access required.
#
#   */2 * * * * /root/sobitas-project/scripts/vps-autodeploy.sh >> /var/log/sobitas-autodeploy.log 2>&1
#
# ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
# GitHub Actions used to SSH into this box to run `docker compose pull`. Every deploy since
# 07/08/2026 failed on that step with
#
#   ssh: handshake failed: unable to authenticate, attempted methods [none password]
#
# while the build, the tests and the image push all succeeded. The images were sitting in the
# registry, correct and unreachable, because a password stored in a GitHub secret had been rotated
# on the server.
#
# That is not a bug to fix once. A deploy pipeline whose only credential is a password breaks every
# time the password is rotated, and it must be rotated. So the direction is inverted: instead of CI
# reaching in, the server reaches out. Nothing to expire, no inbound port, no secret in a CI
# provider, and the box keeps deploying even if GitHub is down.
#
# ── WHAT IT WILL NOT DO ───────────────────────────────────────────────────────────────────
# It never recreates a container whose image did not change. `docker compose up -d` on an unchanged
# image is usually a no-op, but "usually" is not good enough on a storefront: comparing digests
# means a poll that finds nothing new costs one registry HEAD request and touches nothing.

set -uo pipefail

APP_DIR="${APP_DIR:-/root/sobitas-project}"
SERVICES="${SERVICES:-frontend backend-v2 backend-v2-queue backend-v2-scheduler}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend-v2}"
LOCK="/tmp/sobitas-autodeploy.lock"

log() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# Two overlapping runs would race on `compose up` and can leave a service half-recreated. flock
# makes a slow deploy simply skip the next tick instead.
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another run is in progress; skipping"
  exit 0
fi

cd "$APP_DIR" || { log "FATAL: $APP_DIR not found"; exit 1; }

# Track the repo so compose files, migrations and scripts stay in step with the images.
BEFORE_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
git fetch --quiet origin main 2>/dev/null
git checkout --quiet main 2>/dev/null
git pull --quiet --ff-only origin main 2>/dev/null
AFTER_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
[ "$BEFORE_SHA" != "$AFTER_SHA" ] && log "repo $BEFORE_SHA -> $AFTER_SHA"

/usr/bin/env docker compose pull --quiet $SERVICES 2>/dev/null

changed=""
for svc in $SERVICES; do
  # The digest the container is RUNNING versus the digest now tagged :latest locally.
  image="$(docker compose config --images "$svc" 2>/dev/null | head -1)"
  [ -z "$image" ] && continue

  running_id="$(docker inspect --format '{{.Image}}' "$(docker compose ps -q "$svc" 2>/dev/null)" 2>/dev/null || echo '')"
  latest_id="$(docker image inspect --format '{{.Id}}' "$image" 2>/dev/null || echo '')"

  if [ -n "$latest_id" ] && [ "$running_id" != "$latest_id" ]; then
    changed="$changed $svc"
  fi
done

if [ -z "$changed" ] && [ "$BEFORE_SHA" = "$AFTER_SHA" ]; then
  exit 0        # nothing new; stay quiet so the log stays readable
fi

if [ -n "$changed" ]; then
  log "new image(s):$changed"
  # --no-deps so restarting the frontend never bounces mysql or redis underneath it.
  docker compose up -d --no-deps $changed || log "WARN: compose up returned non-zero"
fi

# Migrations after the backend image moves, and after any repo change (a migration can arrive in a
# commit without a new image). --force because there is no TTY here to confirm at.
if echo "$changed" | grep -q "$BACKEND_SERVICE" || [ "$BEFORE_SHA" != "$AFTER_SHA" ]; then
  log "running migrations"
  docker compose exec -T "$BACKEND_SERVICE" php artisan migrate --force 2>&1 | sed 's/^/    /'
  docker compose exec -T "$BACKEND_SERVICE" php artisan config:clear 2>&1 | sed 's/^/    /'
fi

[ -n "$changed" ] && docker image prune -f >/dev/null 2>&1

log "done (repo $AFTER_SHA)"
