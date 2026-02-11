#!/bin/bash
# ==========================================================
# Backend V2 Deployment Script
# ==========================================================
# Run this script on VPS to deploy backend-v2
# Usage: ./deploy-backend-v2.sh
# ==========================================================

set -e

cd /root/sobitas-project

IMAGE="ghcr.io/declared-as-ala/sobitas-backend-v2:latest"

echo "=== Pulling latest image ==="
docker pull "$IMAGE"

# Detect docker compose version
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker compose not found"
    exit 1
fi

echo "=== Stopping old containers ==="
$COMPOSE_CMD stop backend-v2 backend-nginx-v2 2>/dev/null || true
$COMPOSE_CMD rm -f backend-v2-public-init 2>/dev/null || true

echo "=== Copying public assets ==="
$COMPOSE_CMD run --rm backend-v2-public-init || {
    echo "⚠️ Public init failed, but continuing..."
}

echo "=== Starting backend-v2 ==="
$COMPOSE_CMD up -d backend-v2
sleep 5

echo "=== Starting nginx-v2 ==="
$COMPOSE_CMD up -d backend-nginx-v2
sleep 2

echo "=== Health check ==="
if ! docker ps --format '{{.Names}}' | grep -q "^sobitas-backend-v2$"; then
    echo "❌ sobitas-backend-v2 is not running"
    docker logs --tail 100 sobitas-backend-v2 || true
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^sobitas-laravel-nginx-v2$"; then
    echo "❌ sobitas-laravel-nginx-v2 is not running"
    docker logs --tail 50 sobitas-laravel-nginx-v2 || true
    exit 1
fi

echo "=== Container status ==="
docker ps --filter "name=sobitas-backend-v2" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
docker ps --filter "name=sobitas-laravel-nginx-v2" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo "=== Smoke test ==="
if curl -I http://127.0.0.1:8083 >/dev/null 2>&1; then
    echo "✓ Nginx responding on port 8083"
else
    echo "⚠️ Nginx not responding (may need more time or check logs)"
fi

echo "=== Clear Laravel caches ==="
docker exec sobitas-backend-v2 php artisan config:clear || true
docker exec sobitas-backend-v2 php artisan cache:clear || true
docker exec sobitas-backend-v2 php artisan view:clear || true
docker exec sobitas-backend-v2 php artisan route:clear || true
docker exec sobitas-backend-v2 php artisan storage:link || true
echo "✓ Caches cleared"

echo "=== Logs (last 50 lines) ==="
docker logs --tail 50 sobitas-backend-v2 || true

echo "=== Cleanup old images ==="
docker image prune -f || true

echo ""
echo "=== Deployment Complete ==="
echo "Backend v2 is running on http://127.0.0.1:8083"
echo "Configure Nginx Proxy Manager to proxy admin.sobitas.tn -> http://127.0.0.1:8083"
