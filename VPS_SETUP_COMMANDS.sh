#!/bin/bash
# ==========================================================
# One-Time Setup Commands for Backend V2 on VPS
# ==========================================================
# Run these commands ONCE on your VPS to set up backend-v2
# ==========================================================

set -e

cd /root/sobitas-project

echo "=== Step 1: Create environment file ==="
mkdir -p docker/env

# Create backend-v2.env from template
if [ ! -f docker/env/backend-v2.env ]; then
    cat > docker/env/backend-v2.env << 'EOF'
APP_NAME="Sobitas Backend V2"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://admin.sobitas.tn
ASSET_URL=https://admin.sobitas.tn

DB_CONNECTION=mysql
DB_HOST=sobitas-mysql
DB_PORT=3306
DB_DATABASE=protein_db
DB_USERNAME=laravel
DB_PASSWORD=secret

REDIS_HOST=sobitas-redis
REDIS_PASSWORD=
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

LOG_CHANNEL=stderr
LOG_LEVEL=error
EOF
    echo "✓ Created docker/env/backend-v2.env"
    echo "⚠️  IMPORTANT: Edit docker/env/backend-v2.env and set:"
    echo "   - APP_KEY (generate with: php artisan key:generate --show)"
    echo "   - REDIS_PASSWORD (check from backend v1 or leave empty)"
    echo "   - DB_PASSWORD (use same as backend v1)"
else
    echo "✓ docker/env/backend-v2.env already exists"
fi

echo ""
echo "=== Step 2: Generate APP_KEY ==="
echo "Run this command to generate APP_KEY:"
echo "  docker run --rm ghcr.io/declared-as-ala/sobitas-backend-v2:latest php artisan key:generate --show"
echo "Then add the output to APP_KEY in docker/env/backend-v2.env"
read -p "Press Enter after you've set APP_KEY..."

echo ""
echo "=== Step 3: Check Redis Password ==="
echo "Checking if Redis requires password..."
if docker exec sobitas-redis redis-cli ping 2>&1 | grep -q "NOAUTH"; then
    echo "⚠️  Redis requires password. Checking backend v1 env..."
    REDIS_PASS=$(docker exec sobitas-backend env | grep REDIS_PASSWORD | cut -d= -f2 || echo "")
    if [ -n "$REDIS_PASS" ]; then
        echo "Found REDIS_PASSWORD from backend v1: $REDIS_PASS"
        sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASS/" docker/env/backend-v2.env
        echo "✓ Updated REDIS_PASSWORD in backend-v2.env"
    else
        echo "⚠️  Could not detect REDIS_PASSWORD. Please set it manually in docker/env/backend-v2.env"
    fi
else
    echo "✓ Redis does not require password (or password is empty)"
fi

echo ""
echo "=== Step 4: Verify Network ==="
if docker network inspect sobitas-project_sobitas-net >/dev/null 2>&1; then
    echo "✓ Network sobitas-project_sobitas-net exists"
else
    echo "Creating network sobitas-project_sobitas-net..."
    docker network create sobitas-project_sobitas-net
    echo "✓ Network created"
fi

echo ""
echo "=== Step 5: Create Public Volume ==="
if docker volume inspect sobitas-project_backend-v2-public >/dev/null 2>&1; then
    echo "✓ Volume sobitas-project_backend-v2-public exists"
else
    echo "Creating volume sobitas-project_backend-v2-public..."
    docker volume create sobitas-project_backend-v2-public
    echo "✓ Volume created"
fi

echo ""
echo "=== Step 6: Add Services to docker-compose.yml ==="
if grep -q "backend-v2:" docker-compose.yml; then
    echo "✓ backend-v2 services already in docker-compose.yml"
else
    echo "⚠️  You need to add backend-v2 services to docker-compose.yml"
    echo "   See docker-compose.backend-v2.yml for the services to add"
    echo "   Or merge the files:"
    echo "   cat docker-compose.backend-v2.yml >> docker-compose.yml"
    read -p "Press Enter after you've added the services..."
fi

echo ""
echo "=== Step 7: Verify Nginx Config ==="
if [ -f nginx/laravel-v2.conf ]; then
    echo "✓ nginx/laravel-v2.conf exists"
    # Validate nginx config
    docker run --rm \
        -v $(pwd)/nginx/laravel-v2.conf:/etc/nginx/conf.d/default.conf:ro \
        nginx:stable nginx -t && echo "✓ Nginx config is valid"
else
    echo "❌ nginx/laravel-v2.conf not found!"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Ensure docker/env/backend-v2.env has correct values (APP_KEY, REDIS_PASSWORD, DB_PASSWORD)"
echo "2. Add backend-v2 services to docker-compose.yml (if not already added)"
echo "3. Run deployment: ./deploy-backend-v2.sh or use GitHub Actions"
