#!/usr/bin/env bash
#
# Deploy the frontend FROM THE VPS, without GitHub Actions.
#
# ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
# The normal path is .github/workflows/deploy-frontend.yml: GitHub builds the image, pushes it to
# GHCR, then SSHes in and swaps the container. That path has a single point of failure that is not
# ours — on 2026-08-06 GitHub Actions went into a `major_outage` and the deploy job sat queued for
# over three hours with the job never handed to a runner. Two finished, verified commits could not
# reach the site, and there was nothing to fix on the server, because nothing on the server was
# broken.
#
# This script is the same deploy with the middleman removed: build the image HERE, tag it with the
# name compose already expects, recreate the container. docker-compose.yml's `frontend` service has
# no `pull_policy` and no `build:` section, so a locally-tagged image is used exactly as if it had
# come from the registry.
#
# ── RUN IT ON THE VPS ──────────────────────────────────────────────────────────────────────────
#   cd /root/sobitas-project && bash deploy-frontend-locally.sh
#
# It updates the checkout itself. It will NOT do that over uncommitted edits to tracked files —
# the normal deploy never touches the VPS's git checkout at all (it only pulls a Docker image), so
# that checkout can quietly be dirty or years stale and nobody would find out until the first time
# somebody ran a `git reset --hard` across it. It stops and shows you what it found instead.
#
# ── THE BUILD ARGS ARE NOT OPTIONAL ────────────────────────────────────────────────────────────
# They are copied verbatim from deploy-frontend.yml and they are baked into the CLIENT bundle at
# build time. Dropping one does not fail the build — it ships a site whose browser code and server
# code disagree about where the API and the images live, which shows up as product photos that
# flash and vanish. Keeping them in a script instead of in a chat message is most of the point.
#
# ── WHEN ACTIONS COMES BACK ────────────────────────────────────────────────────────────────────
# Nothing to undo. The queued run rebuilds the same commit, pushes the same `:latest`, pulls it and
# recreates the container — it converges on identical code.

set -euo pipefail

APP_DIR="${APP_DIR:-/root/sobitas-project}"
IMAGE="ghcr.io/declared-as-ala/sobitas-frontend:latest"

cd "$APP_DIR"

# ── update the checkout, refusing to throw away work ──────────────────────────────────────────
DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  echo "✗ There are uncommitted changes to tracked files here. Refusing to overwrite them."
  echo "$DIRTY" | sed 's/^/    /'
  echo
  echo "  If they are wanted:      git stash"
  echo "  If they are not wanted:  git checkout -- ."
  echo "  Then re-run this script."
  exit 1
fi

echo "▶ fetching origin/main…"
git fetch origin main
git checkout -q main 2>/dev/null || git checkout -q -B main origin/main
git merge --ff-only origin/main

echo "▶ commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# A Next.js production build peaks around 2-4 GB. On a small VPS it is killed by the OOM killer,
# and the symptom — a bare "Killed", or exit 137 — looks nothing like a memory problem to anyone
# who has not seen it before. Say so up front rather than after twenty minutes.
TOTAL_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)
SWAP_MB=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo 0)
echo "▶ memory: ${TOTAL_MB} MB RAM + ${SWAP_MB} MB swap"
if [ "${TOTAL_MB:-0}" -lt 3500 ] && [ "$((TOTAL_MB + SWAP_MB))" -lt 4500 ]; then
  echo "⚠  Under ~4 GB of RAM+swap. If the build dies with 'Killed' or exit 137 that is the OOM"
  echo "   killer, not a code error. Add swap and re-run:"
  echo "     fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
fi

echo "▶ building $IMAGE (this takes a while)…"
docker build \
  -f frontend/Dockerfile ./frontend \
  -t "$IMAGE" \
  --build-arg NEXT_PUBLIC_API_URL=https://protein.tn/api-proxy \
  --build-arg NEXT_PUBLIC_STORAGE_URL=https://admin.protein.tn/storage \
  --build-arg API_BACKEND_URL=http://backend-nginx-v2/api \
  --build-arg STORAGE_BACKEND_URL=http://backend-nginx-v2/storage

echo "▶ recreating the frontend container…"
docker compose up -d --force-recreate --no-deps frontend

echo "▶ waiting for the container to answer…"
# Assert the deploy actually took, rather than trusting that `up -d` returning 0 means the app is
# serving. A container that boots and immediately crashes still exits 0 here.
ok=0
for _ in $(seq 1 30); do
  if docker compose exec -T frontend wget -q -O /dev/null http://localhost:3000/ 2>/dev/null \
    || curl -sf -o /dev/null http://localhost:3000/ 2>/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" != "1" ]; then
  echo "✗ the frontend container is not answering. Last 40 log lines:"
  docker compose logs --tail 40 frontend || true
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo "✓ frontend deployed from $(git rev-parse --short HEAD)"
echo "  Now hard-refresh https://protein.tn and confirm the change is visible."
