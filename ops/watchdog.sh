#!/usr/bin/env bash
#
# protein.tn origin watchdog — restarts the backend when it stops answering, and frees disk
# before a full one takes the site down.
#
# ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
# On 13/08/2026 admin.protein.tn returned 504 on every URL — the Filament panel and the whole API —
# for hours. Nothing was broken enough to exit: php-fpm was `Up`, MySQL was `Up`, the deploy was
# green. The workers were simply all blocked, so `restart: unless-stopped` never fired, because it
# only acts on a process that EXITS. The storefront kept serving 200s from its ISR cache the entire
# time, so even a uptime monitor on protein.tn would have stayed green.
#
# ── WHY A HOST SCRIPT AND NOT AN AUTOHEAL SIDECAR ────────────────────────────────────────────
# The usual answer is a container that watches Docker's health status and restarts what it finds
# unhealthy. That needs /var/run/docker.sock mounted into it, which hands anything inside that
# container root-equivalent control of the host. For one restart rule that is a poor trade. This is
# 60 lines of bash owned by the same root that already owns the daemon, with no new attack surface
# and nothing new to keep updated.
#
# ── INSTALL ──────────────────────────────────────────────────────────────────────────────────
#   install -m 0755 /root/sobitas-project/ops/watchdog.sh /usr/local/bin/protein-watchdog
#   crontab -e     # then add, exactly:
#   */5 * * * * /usr/local/bin/protein-watchdog >> /var/log/protein-watchdog.log 2>&1
#
# Verify it runs at all before trusting it — a watchdog nobody has seen fire is a wish:
#   /usr/local/bin/protein-watchdog ; tail /var/log/protein-watchdog.log
#
# ── WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────────
# It never restarts MySQL. Restarting a database to clear a symptom drops every open transaction and
# can turn a slow site into a corrupted one; if PHP is healthy and MySQL is not, that is a human's
# decision. It also refuses to restart more than twice an hour: a service failing in a loop needs
# somebody to read the logs, and a watchdog that keeps papering over it guarantees nobody does.

set -uo pipefail

ENDPOINT="${WATCHDOG_ENDPOINT:-http://127.0.0.1:8083/api/coordonnees}"
COMPOSE_DIR="${WATCHDOG_COMPOSE_DIR:-/root/sobitas-project}"
TIMEOUT="${WATCHDOG_TIMEOUT:-20}"
# Two probes before acting. One 20s timeout during a genuine traffic spike is not an outage.
PROBES="${WATCHDOG_PROBES:-2}"
STATE_DIR=/var/lib/protein-watchdog
MAX_RESTARTS_PER_HOUR="${WATCHDOG_MAX_RESTARTS:-2}"
DISK_WARN_PCT="${WATCHDOG_DISK_WARN_PCT:-85}"

mkdir -p "$STATE_DIR"
log() { echo "[$(date -Is)] $*"; }

# ── 1. DISK, BEFORE ANYTHING ELSE ────────────────────────────────────────────────────────────
# A full disk is the failure that looks like every other failure: MySQL cannot write, so every PHP
# worker blocks on it, so the proxy times out at 60s and every URL returns 504. Reclaiming here is
# both the cheaper fix and the one that stops the restart below being pointless.
DISK_PCT=$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -n "${DISK_PCT:-}" ] && [ "$DISK_PCT" -ge "$DISK_WARN_PCT" ]; then
  log "DISK ${DISK_PCT}% — over ${DISK_WARN_PCT}%, reclaiming"
  # Only ever the three things that are safe to delete without thinking: unused images, build
  # cache, and pre-deploy DB dumps beyond the newest ten. Never `docker system prune --volumes` —
  # mysql-data is a named volume and that flag has taken production databases before.
  docker image prune -af >/dev/null 2>&1 || true
  docker builder prune -af >/dev/null 2>&1 || true
  ls -1t /var/sobitas/backups/db-pre-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f || true
  log "DISK now $(df --output=pcent / | tail -1 | tr -d ' ')"
fi

# ── 2. PROBE THE ORIGIN ──────────────────────────────────────────────────────────────────────
# 127.0.0.1:8083 rather than https://admin.protein.tn on purpose: it skips Cloudflare and the host
# proxy, so a red result means the application is genuinely down rather than that DNS moved or a
# certificate expired. Those are real problems too — they are just not ones a container restart fixes.
ok=0
for i in $(seq 1 "$PROBES"); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$ENDPOINT" 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then ok=1; break; fi
  log "probe $i/$PROBES -> HTTP $code"
  [ "$i" -lt "$PROBES" ] && sleep 5
done

if [ "$ok" = "1" ]; then
  rm -f "$STATE_DIR/failing"
  exit 0
fi

# ── 3. RATE LIMIT ────────────────────────────────────────────────────────────────────────────
STAMP_FILE="$STATE_DIR/restarts"
now=$(date +%s)
touch "$STAMP_FILE"
# Keep only stamps from the last hour, then count them.
awk -v cutoff="$((now - 3600))" '$1 > cutoff' "$STAMP_FILE" > "$STAMP_FILE.tmp" && mv "$STAMP_FILE.tmp" "$STAMP_FILE"
recent=$(wc -l < "$STAMP_FILE" | tr -d ' ')

if [ "$recent" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
  log "DOWN, but already restarted ${recent}x this hour — NOT restarting again."
  log "     This needs a human. Start with: docs/runbooks/vps-504-outage.md"
  log "     docker compose ps ; docker logs --tail 200 sobitas-backend-v2 ; df -h /"
  exit 1
fi

# ── 4. RESTART, NARROWEST FIRST ──────────────────────────────────────────────────────────────
log "DOWN (last probe HTTP $code) — restarting backend-v2"
echo "$now" >> "$STAMP_FILE"
cd "$COMPOSE_DIR" || { log "cannot cd $COMPOSE_DIR"; exit 1; }
docker compose restart backend-v2 >/dev/null 2>&1 || log "compose restart backend-v2 failed"
sleep 20

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$ENDPOINT" 2>/dev/null || echo 000)
if [ "$code" = "200" ]; then
  log "RECOVERED after restarting backend-v2"
  exit 0
fi

log "still HTTP $code — restarting backend-nginx-v2 as well"
docker compose restart backend-nginx-v2 >/dev/null 2>&1 || log "compose restart backend-nginx-v2 failed"
sleep 15

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$ENDPOINT" 2>/dev/null || echo 000)
if [ "$code" = "200" ]; then
  log "RECOVERED after restarting backend-nginx-v2"
  exit 0
fi

# MySQL is deliberately left alone here — see the header. Stop and hand over.
log "STILL DOWN (HTTP $code) after restarting php-fpm and nginx. Not touching MySQL automatically."
log "     Follow docs/runbooks/vps-504-outage.md §1 — the likely remaining causes are MySQL itself,"
log "     an OOM kill, or a disk that filled again."
exit 1
