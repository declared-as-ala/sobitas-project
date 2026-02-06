#!/bin/bash
set -e

echo "=== Clearing Laravel Cache in Docker Container ==="

# Determine which backend container is running
if docker ps | grep -q "sobitas-backend-v2"; then
    CONTAINER_NAME="sobitas-backend-v2"
    echo "Using container: $CONTAINER_NAME"
elif docker ps | grep -q "sobitas-backend"; then
    CONTAINER_NAME="sobitas-backend"
    echo "Using container: $CONTAINER_NAME"
else
    echo "❌ No backend container found!"
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

# Clear all Laravel caches
echo ""
echo "1. Clearing application cache..."
docker exec -it $CONTAINER_NAME php artisan cache:clear

echo "2. Clearing config cache..."
docker exec -it $CONTAINER_NAME php artisan config:clear

echo "3. Clearing route cache..."
docker exec -it $CONTAINER_NAME php artisan route:clear

echo "4. Clearing view cache..."
docker exec -it $CONTAINER_NAME php artisan view:clear

echo "5. Clearing compiled classes..."
docker exec -it $CONTAINER_NAME php artisan clear-compiled

echo "6. Optimizing (clearing all)..."
docker exec -it $CONTAINER_NAME php artisan optimize:clear

echo ""
echo "✅ All caches cleared successfully!"
echo ""
echo "To rebuild caches (for production):"
echo "  docker exec -it $CONTAINER_NAME php artisan config:cache"
echo "  docker exec -it $CONTAINER_NAME php artisan route:cache"
echo "  docker exec -it $CONTAINER_NAME php artisan view:cache"
