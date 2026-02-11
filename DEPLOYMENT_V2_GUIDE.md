# Filament Backend V2 - Production Deployment Guide

## Domain Routing

- `admin.protein.tn` → existing `sobitas-backend` (Voyager) - **DO NOT CHANGE**
- `protein.tn` → frontend - **DO NOT CHANGE**
- `admin.sobitas.tn` → NPM → `http://127.0.0.1:8083` → `backend-nginx-v2` → `sobitas-backend-v2:9000`

## One-Time Setup on VPS

### 1. Create environment file

```bash
cd /root/sobitas-project

# Create env directory if it doesn't exist
mkdir -p env

# Copy template and edit
cp env/backend-v2.env.template env/backend-v2.env
nano env/backend-v2.env
```

**IMPORTANT:** Fill in these values in `env/backend-v2.env`:
- `APP_KEY` - Generate with: `docker run --rm ghcr.io/declared-as-ala/sobitas-backend-v2:latest php artisan key:generate --show`
- `DB_PASSWORD` - Use the same password as your existing `.env`
- `REDIS_PASSWORD` - Use the same password as your existing `.env` (or leave empty if redis has no password)

### 2. Verify nginx config exists

```bash
# Verify the config file exists
ls -la nginx/admin.sobitas.tn.conf

# Test nginx config syntax (if nginx is installed on host)
nginx -t -c /root/sobitas-project/nginx/admin.sobitas.tn.conf 2>/dev/null || echo "Nginx not installed on host (OK, will test in container)"
```

### 3. Ensure external network exists

```bash
# Check if network exists
docker network inspect sobitas-project_sobitas-net >/dev/null 2>&1 || docker network create sobitas-project_sobitas-net
```

### 4. Start services

```bash
cd /root/sobitas-project

# Pull latest image first
docker pull ghcr.io/declared-as-ala/sobitas-backend-v2:latest

# Start services
docker compose up -d backend-v2-public-init
docker compose up -d backend-v2
docker compose up -d backend-nginx-v2

# Wait a moment
sleep 5

# Verify containers are running
docker ps | grep -E "sobitas-backend-v2|sobitas-laravel-nginx-v2"
```

### 5. Configure Nginx Proxy Manager (NPM)

In NPM web interface:
1. Add Proxy Host for `admin.sobitas.tn`
2. Forward to: `http://127.0.0.1:8083`
3. Enable SSL (Let's Encrypt)
4. Save

### 6. Run initial Laravel setup (ONE TIME ONLY)

```bash
# Clear caches
docker exec sobitas-backend-v2 php artisan optimize:clear

# Remove broken cache files
docker exec sobitas-backend-v2 rm -f bootstrap/cache/*.php

# Create storage link
docker exec sobitas-backend-v2 php artisan storage:link

# Verify APP_KEY is set
docker exec sobitas-backend-v2 php artisan tinker --execute="echo config('app.key');"
```

## Deployment Commands (After Each Push)

### Automated (via GitHub Actions)

The workflow automatically:
1. Builds and pushes image to GHCR
2. Pulls latest image on VPS
3. Stops old containers
4. Copies public assets
5. Starts new containers
6. Clears caches

### Manual Deployment

If you need to deploy manually:

```bash
cd /root/sobitas-project

# Login to GHCR (if needed)
echo "YOUR_GHCR_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull latest image
docker pull ghcr.io/declared-as-ala/sobitas-backend-v2:latest

# Stop old containers
docker compose stop backend-v2 backend-nginx-v2

# Copy public assets
docker compose run --rm backend-v2-public-init

# Start backend-v2
docker compose up -d --force-recreate backend-v2

# Wait a moment
sleep 5

# Start nginx-v2
docker compose up -d --force-recreate backend-nginx-v2

# Health checks
curl -I http://127.0.0.1:8083
curl -I http://127.0.0.1:8083/admin

# Clear caches
docker exec sobitas-backend-v2 php artisan optimize:clear
docker exec sobitas-backend-v2 rm -f bootstrap/cache/*.php
docker exec sobitas-backend-v2 php artisan storage:link

# Check logs
docker logs --tail 50 sobitas-backend-v2
docker logs --tail 50 sobitas-laravel-nginx-v2
```

## Health Checks

```bash
# Check containers are running
docker ps | grep -E "sobitas-backend-v2|sobitas-laravel-nginx-v2"

# Test nginx responds
curl -I http://127.0.0.1:8083
curl -I http://127.0.0.1:8083/admin

# Check PHP-FPM is working
docker exec sobitas-backend-v2 php -v

# Check Laravel is working
docker exec sobitas-backend-v2 php artisan --version

# View logs
docker logs --tail 100 sobitas-backend-v2
docker logs --tail 50 sobitas-laravel-nginx-v2
```

## Safe Artisan Commands (Manual Only)

**DO NOT run these automatically in entrypoint:**

```bash
# Clear all caches
docker exec sobitas-backend-v2 php artisan optimize:clear

# Remove broken cache files
docker exec sobitas-backend-v2 rm -f bootstrap/cache/*.php

# Create storage link
docker exec sobitas-backend-v2 php artisan storage:link

# Optimize (after clearing)
docker exec sobitas-backend-v2 php artisan optimize
```

## Troubleshooting

### HTTP 500 Errors

```bash
# Check logs
docker logs --tail 100 sobitas-backend-v2

# Clear caches
docker exec sobitas-backend-v2 php artisan optimize:clear
docker exec sobitas-backend-v2 rm -f bootstrap/cache/*.php

# Verify APP_KEY
docker exec sobitas-backend-v2 php artisan tinker --execute="echo config('app.key');"
```

### Assets 404

```bash
# Verify public assets are copied
docker compose run --rm backend-v2-public-init

# Check nginx can see files
docker exec sobitas-laravel-nginx-v2 ls -la /var/www/html/public/build

# Restart nginx
docker compose restart backend-nginx-v2
```

### Redis NOAUTH Error

```bash
# Check redis password in env file
cat env/backend-v2.env | grep REDIS_PASSWORD

# Verify redis container password
docker exec sobitas-redis redis-cli -a "YOUR_PASSWORD" ping

# If redis has no password, ensure REDIS_PASSWORD is empty in env file
```

### Container Won't Start

```bash
# Check logs
docker logs sobitas-backend-v2

# Verify env file exists
ls -la env/backend-v2.env

# Verify APP_KEY is set
cat env/backend-v2.env | grep APP_KEY
```

## Important Notes

- **DO NOT** run `key:generate` automatically (APP_KEY must be in env file)
- **DO NOT** run migrations automatically (run manually when needed)
- **DO NOT** touch existing containers (sobitas-backend, frontend, mysql, redis)
- **DO NOT** modify NPM configuration (only add proxy host for admin.sobitas.tn)
- All v2 services use the **same docker-compose.yml** file
- Network is **external**: `sobitas-project_sobitas-net`
- Nginx config is mounted from: `./nginx/admin.sobitas.tn.conf`
