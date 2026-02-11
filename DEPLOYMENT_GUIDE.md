# Backend V2 Deployment Guide

## One-Time Setup on VPS

### Step 1: Create Environment File

```bash
cd /root/sobitas-project

# Create env directory if it doesn't exist
mkdir -p docker/env

# Copy template and edit
cp docker/env/backend-v2.env.template docker/env/backend-v2.env
nano docker/env/backend-v2.env
```

**Important values to set:**
- `APP_KEY`: Generate with `php artisan key:generate --show` (run in a temporary container or locally)
- `REDIS_PASSWORD`: Check existing redis password from backend v1 env or leave empty if no auth
- `DB_PASSWORD`: Use same password as backend v1

### Step 2: Generate APP_KEY

```bash
# Option A: Generate in temporary container
docker run --rm \
  -v $(pwd)/docker/env/backend-v2.env:/tmp/.env \
  ghcr.io/declared-as-ala/sobitas-backend-v2:latest \
  sh -c "cd /var/www/html && php artisan key:generate --show"

# Option B: Generate locally and add to backend-v2.env manually
# Run: php artisan key:generate --show
# Copy the output to APP_KEY in backend-v2.env
```

### Step 3: Verify Redis Password

```bash
# Check if redis requires password
docker exec sobitas-redis redis-cli ping

# If it returns "NOAUTH Authentication required", check backend v1 env:
docker exec sobitas-backend env | grep REDIS_PASSWORD

# Update backend-v2.env with the same REDIS_PASSWORD value
```

### Step 4: Create External Network (if not exists)

```bash
# Check if network exists
docker network inspect sobitas-project_sobitas-net >/dev/null 2>&1

# If it doesn't exist, create it
docker network create sobitas-project_sobitas-net
```

### Step 5: Create Public Volume

```bash
docker volume create sobitas-project_backend-v2-public
```

### Step 6: Add Services to docker-compose.yml

```bash
cd /root/sobitas-project

# Backup existing docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Append backend-v2 services (or merge manually)
cat docker-compose.backend-v2.yml >> docker-compose.yml

# OR manually add the services section to your existing docker-compose.yml
```

### Step 7: Verify Nginx Config

```bash
# Ensure nginx config exists
test -f nginx/laravel-v2.conf && echo "✓ Config exists" || echo "❌ Config missing"

# Validate nginx config syntax
docker run --rm \
  -v $(pwd)/nginx/laravel-v2.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:stable nginx -t
```

## Deployment Workflow (After Setup)

### Step 1: Pull Latest Image

```bash
cd /root/sobitas-project

# Login to GHCR (if needed)
echo "$GHCR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull latest image
docker pull ghcr.io/declared-as-ala/sobitas-backend-v2:latest
```

### Step 2: Stop Old Containers (if running)

```bash
docker compose stop backend-v2 backend-nginx-v2 backend-v2-public-init 2>/dev/null || true
docker compose rm -f backend-v2-public-init 2>/dev/null || true
```

### Step 3: Copy Public Assets

```bash
# Run init job to copy public assets to volume
docker compose run --rm backend-v2-public-init
```

### Step 4: Start Backend V2

```bash
# Start backend-v2
docker compose up -d backend-v2

# Wait for health check
sleep 5

# Verify it's running
docker ps --filter "name=sobitas-backend-v2"
docker logs --tail 50 sobitas-backend-v2
```

### Step 5: Start Nginx V2

```bash
# Start nginx
docker compose up -d backend-nginx-v2

# Verify it's running
docker ps --filter "name=sobitas-laravel-nginx-v2"
docker logs --tail 20 sobitas-laravel-nginx-v2
```

### Step 6: Test Locally

```bash
# Test nginx on localhost:8083
curl -I http://127.0.0.1:8083

# Test admin route
curl -I http://127.0.0.1:8083/admin

# Check assets
curl -I http://127.0.0.1:8083/build/app.css 2>/dev/null || echo "Asset not found (may need rebuild)"
```

### Step 7: Run Safe Artisan Commands

```bash
# Clear caches (safe)
docker exec sobitas-backend-v2 php artisan config:clear
docker exec sobitas-backend-v2 php artisan cache:clear
docker exec sobitas-backend-v2 php artisan view:clear
docker exec sobitas-backend-v2 php artisan route:clear

# Create storage link (safe)
docker exec sobitas-backend-v2 php artisan storage:link

# Optimize (optional, safe)
docker exec sobitas-backend-v2 php artisan optimize
```

### Step 8: Run Migrations (ONLY when you choose to)

```bash
# ⚠️ OPTIONAL: Run migrations manually (only when you decide to)
# docker exec sobitas-backend-v2 php artisan migrate --force

# Check migration status first
docker exec sobitas-backend-v2 php artisan migrate:status
```

### Step 9: Configure Nginx Proxy Manager

1. Go to NPM admin panel
2. Add Proxy Host:
   - Domain: `admin.sobitas.tn`
   - Forward Hostname/IP: `127.0.0.1`
   - Forward Port: `8083`
   - SSL: Enable (Let's Encrypt)
3. Save and test

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs sobitas-backend-v2

# Common issues:
# - Missing APP_KEY: Generate and add to backend-v2.env
# - Redis auth error: Check REDIS_PASSWORD in backend-v2.env
# - DB connection: Verify DB credentials match backend v1
```

### Assets return 404

```bash
# Re-run public init job
docker compose run --rm backend-v2-public-init

# Check if assets exist in volume
docker run --rm -v sobitas-project_backend-v2-public:/public alpine ls -la /public/build

# Rebuild image if assets weren't built during image build
```

### Redis NOAUTH Error

```bash
# Check redis password requirement
docker exec sobitas-redis redis-cli -a "YOUR_PASSWORD" ping

# Update backend-v2.env with correct REDIS_PASSWORD
# Restart container
docker compose restart backend-v2
```

### Nginx config error

```bash
# Validate config
docker run --rm \
  -v $(pwd)/nginx/laravel-v2.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:stable nginx -t

# Check nginx logs
docker logs sobitas-laravel-nginx-v2
```

## Quick Deploy Script

Save this as `deploy-backend-v2.sh`:

```bash
#!/bin/bash
set -e

cd /root/sobitas-project

echo "=== Pulling latest image ==="
docker pull ghcr.io/declared-as-ala/sobitas-backend-v2:latest

echo "=== Stopping old containers ==="
docker compose stop backend-v2 backend-nginx-v2 2>/dev/null || true
docker compose rm -f backend-v2-public-init 2>/dev/null || true

echo "=== Copying public assets ==="
docker compose run --rm backend-v2-public-init

echo "=== Starting backend-v2 ==="
docker compose up -d backend-v2
sleep 5

echo "=== Starting nginx-v2 ==="
docker compose up -d backend-nginx-v2

echo "=== Clearing caches ==="
docker exec sobitas-backend-v2 php artisan config:clear || true
docker exec sobitas-backend-v2 php artisan cache:clear || true
docker exec sobitas-backend-v2 php artisan view:clear || true
docker exec sobitas-backend-v2 php artisan route:clear || true
docker exec sobitas-backend-v2 php artisan storage:link || true

echo "=== Health check ==="
docker ps --filter "name=sobitas-backend-v2"
curl -I http://127.0.0.1:8083 || echo "⚠️ Nginx not responding"

echo "=== Deployment complete ==="
```

Make it executable:
```bash
chmod +x deploy-backend-v2.sh
```
