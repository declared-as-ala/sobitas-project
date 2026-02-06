#!/bin/bash
set -e

echo "=== Checking Backend V2 Container ==="
echo ""

# Check if container exists with either name
echo "1. Checking for Backend V2 containers..."
if docker ps -a | grep -E "sobitas.*backend.*v2|backend.*v2" | grep -v grep; then
    echo "✓ Found Backend V2 container(s)"
    echo ""
    docker ps -a | grep -E "sobitas.*backend.*v2|backend.*v2" | grep -v grep
else
    echo "❌ No Backend V2 container found"
    echo ""
    echo "Available containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

echo ""
echo "2. Checking container status..."
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "backend.*v2|sobitas.*backend.*v2" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Could not find Backend V2 container"
    exit 1
fi

echo "Container name: $CONTAINER_NAME"
echo ""

# Check if running
if docker ps --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo "✓ Container is RUNNING"
    echo ""
    echo "Container details:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
else
    echo "⚠️ Container is NOT running"
    echo ""
    echo "Container details:"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
    echo ""
    echo "To start it:"
    echo "  docker start $CONTAINER_NAME"
    echo "  OR"
    echo "  docker compose up -d backend-v2"
fi

echo ""
echo "3. Checking container logs (last 20 lines)..."
docker logs --tail 20 "$CONTAINER_NAME" 2>&1 || echo "Could not read logs"

echo ""
echo "4. Checking container health..."
if docker inspect "$CONTAINER_NAME" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
    echo "✓ Container is healthy"
elif docker inspect "$CONTAINER_NAME" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "unhealthy"; then
    echo "❌ Container is unhealthy"
    echo "Health check logs:"
    docker inspect "$CONTAINER_NAME" --format='{{json .State.Health}}' | jq -r '.Log[-1].Output' 2>/dev/null || echo "Could not read health check"
else
    echo "⚠️ No health check configured or status unknown"
fi

echo ""
echo "5. Testing PHP inside container..."
if docker exec "$CONTAINER_NAME" php -v 2>/dev/null; then
    echo "✓ PHP is working"
else
    echo "❌ PHP is not working or container is not running"
fi

echo ""
echo "6. Checking Laravel installation..."
if docker exec "$CONTAINER_NAME" test -f /var/www/html/artisan 2>/dev/null; then
    echo "✓ Laravel is installed"
    echo "Laravel version:"
    docker exec "$CONTAINER_NAME" php /var/www/html/artisan --version 2>/dev/null || echo "Could not get version"
else
    echo "❌ Laravel not found in container"
fi

echo ""
echo "=== Summary ==="
echo "Container Name: $CONTAINER_NAME"
echo "Status: $(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}' 2>/dev/null || echo 'unknown')"
echo "Image: $(docker inspect "$CONTAINER_NAME" --format='{{.Config.Image}}' 2>/dev/null || echo 'unknown')"
echo ""
echo "To view full logs: docker logs $CONTAINER_NAME"
echo "To restart: docker restart $CONTAINER_NAME"
echo "To exec into container: docker exec -it $CONTAINER_NAME bash"
