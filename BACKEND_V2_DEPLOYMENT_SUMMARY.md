# Backend V2 Deployment - Complete Solution

## 📋 Summary

This solution deploys **backend-v2 (Filament)** alongside existing **backend v1 (Voyager)** without touching the production stack.

**Key Points:**
- ✅ Uses external network: `sobitas-project_sobitas-net`
- ✅ Uses dedicated env file: `docker/env/backend-v2.env`
- ✅ No automatic migrations/key:generate at boot
- ✅ Nginx v2 listens on `127.0.0.1:8083` (NPM proxies to it)
- ✅ Assets built during Docker image build
- ✅ Persistent volumes for storage, vendor, bootstrap cache, and public assets

---

## 📁 Files Delivered

### 1. `docker-compose.backend-v2.yml`
**Purpose:** Services to add to your existing `docker-compose.yml`

**Services:**
- `backend-v2`: PHP-FPM container (GHCR image)
- `backend-v2-public-init`: One-shot job to copy public assets to volume
- `backend-nginx-v2`: Nginx serving on port 8083

**Key Features:**
- External network: `sobitas-project_sobitas-net`
- External volume: `sobitas-project_backend-v2-public`
- Production-safe entrypoint (no auto migrations)
- Uses `docker/env/backend-v2.env` for environment

### 2. `nginx/laravel-v2.conf`
**Purpose:** Nginx configuration for backend-v2

**Key Features:**
- `root /var/www/html/public;`
- `try_files $uri $uri/ /index.php?$query_string;`
- `fastcgi_pass sobitas-backend-v2:9000;`
- Serves `/storage/` and `/build/` (Vite assets)
- Valid nginx syntax (no shell commands)

### 3. `docker/env/backend-v2.env.template`
**Purpose:** Template for backend-v2 environment variables

**Required Values:**
- `APP_KEY`: Generate with `php artisan key:generate --show`
- `REDIS_PASSWORD`: Check from backend v1 or leave empty
- `DB_PASSWORD`: Use same as backend v1
- `APP_URL=https://admin.sobitas.tn`

### 4. `VPS_SETUP_COMMANDS.sh`
**Purpose:** One-time setup script for VPS

**What it does:**
- Creates `docker/env/backend-v2.env`
- Checks Redis password
- Creates network and volume
- Validates nginx config

### 5. `deploy-backend-v2.sh`
**Purpose:** Deployment script (can be run manually or via GitHub Actions)

**What it does:**
- Pulls latest image
- Runs public init job
- Starts backend-v2 and nginx-v2
- Clears caches
- Health checks

### 6. `.github/workflows/deploy-filament.yml` (Updated)
**Purpose:** GitHub Actions workflow for automated deployment

**Fixes:**
- ✅ Removed invalid `retry` and `retry_interval` parameters
- ✅ Uses only `password` (no `key` conflict)
- ✅ Uses docker-compose commands
- ✅ Runs public init job
- ✅ Smoke tests on port 8083

---

## 🚀 One-Time Setup on VPS

### Step 1: Create Environment File

```bash
cd /root/sobitas-project

# Run setup script
chmod +x VPS_SETUP_COMMANDS.sh
./VPS_SETUP_COMMANDS.sh
```

**OR manually:**

```bash
mkdir -p docker/env

# Create backend-v2.env
cat > docker/env/backend-v2.env << 'EOF'
APP_NAME="Sobitas Backend V2"
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
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
```

### Step 2: Generate APP_KEY

```bash
# Generate APP_KEY
docker run --rm \
  ghcr.io/declared-as-ala/sobitas-backend-v2:latest \
  php artisan key:generate --show

# Copy output and add to docker/env/backend-v2.env
nano docker/env/backend-v2.env
```

### Step 3: Check Redis Password

```bash
# Test Redis
docker exec sobitas-redis redis-cli ping

# If "NOAUTH", get password from backend v1
docker exec sobitas-backend env | grep REDIS_PASSWORD

# Update backend-v2.env with the password
nano docker/env/backend-v2.env
```

### Step 4: Create Network and Volume

```bash
# Network (should already exist)
docker network inspect sobitas-project_sobitas-net || \
  docker network create sobitas-project_sobitas-net

# Volume
docker volume create sobitas-project_backend-v2-public
```

### Step 5: Add Services to docker-compose.yml

```bash
# Option A: Append (if docker-compose.yml doesn't have backend-v2 yet)
cat docker-compose.backend-v2.yml >> docker-compose.yml

# Option B: Manually merge the services section
nano docker-compose.yml
# Add the services from docker-compose.backend-v2.yml
```

**Important:** Ensure the `networks` section uses external network:
```yaml
networks:
  sobitas-net:
    external: true
    name: sobitas-project_sobitas-net
```

### Step 6: Verify Nginx Config

```bash
# Validate syntax
docker run --rm \
  -v $(pwd)/nginx/laravel-v2.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:stable nginx -t
```

---

## 🔄 Deployment Workflow

### Manual Deployment

```bash
cd /root/sobitas-project
chmod +x deploy-backend-v2.sh
./deploy-backend-v2.sh
```

### Automated Deployment (GitHub Actions)

1. Push changes to `filament/**`
2. GitHub Actions will:
   - Build Docker image
   - Push to GHCR
   - SSH to VPS
   - Pull image
   - Run public init
   - Start containers
   - Clear caches
   - Smoke test

---

## 🔧 Manual Artisan Commands (After Container is Running)

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

# ⚠️ Migrations (ONLY when you choose to)
docker exec sobitas-backend-v2 php artisan migrate:status
docker exec sobitas-backend-v2 php artisan migrate --force
```

---

## 🌐 Nginx Proxy Manager Configuration

1. Go to NPM admin panel
2. Add Proxy Host:
   - **Domain names:** `admin.sobitas.tn`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `127.0.0.1`
   - **Forward Port:** `8083`
   - **SSL:** Enable (Let's Encrypt)
3. Save and test

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs sobitas-backend-v2

# Common issues:
# - Missing APP_KEY: Generate and add to backend-v2.env
# - Redis auth: Check REDIS_PASSWORD
# - DB connection: Verify credentials
```

### Assets return 404

```bash
# Re-run public init
docker compose run --rm backend-v2-public-init

# Check volume
docker run --rm -v sobitas-project_backend-v2-public:/public alpine ls -la /public/build
```

### Redis NOAUTH Error

```bash
# Check if password is required
docker exec sobitas-redis redis-cli ping

# If NOAUTH, get password from backend v1
docker exec sobitas-backend env | grep REDIS_PASSWORD

# Update backend-v2.env and restart
docker compose restart backend-v2
```

### Nginx config error

```bash
# Validate
docker run --rm \
  -v $(pwd)/nginx/laravel-v2.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:stable nginx -t

# Check logs
docker logs sobitas-laravel-nginx-v2
```

---

## ✅ Verification Checklist

- [ ] `docker/env/backend-v2.env` exists with correct values
- [ ] `APP_KEY` is set in backend-v2.env
- [ ] `REDIS_PASSWORD` matches backend v1 (or empty if no auth)
- [ ] Network `sobitas-project_sobitas-net` exists
- [ ] Volume `sobitas-project_backend-v2-public` exists
- [ ] Services added to `docker-compose.yml`
- [ ] Nginx config validated
- [ ] Containers start successfully
- [ ] `curl http://127.0.0.1:8083` returns 200
- [ ] NPM configured to proxy `admin.sobitas.tn` -> `127.0.0.1:8083`

---

## 📝 Domain Routing Summary

- **admin.protein.tn** → Existing backend v1 (Voyager) - **DO NOT CHANGE**
- **protein.tn** → Frontend - **DO NOT CHANGE**
- **admin.sobitas.tn** → New backend v2 (Filament) via NPM → `127.0.0.1:8083`

---

## 🔒 Security Notes

1. **Never commit `docker/env/backend-v2.env`** - Add to `.gitignore`
2. **APP_KEY must be unique** - Don't reuse from backend v1
3. **Redis password** - Use same as backend v1 if required
4. **Nginx binds to localhost only** - Port 8083 is not publicly accessible

---

## 📦 Container Names (Exact)

- `sobitas-backend-v2` (PHP-FPM)
- `sobitas-laravel-nginx-v2` (Nginx)
- `backend-v2-public-init` (One-shot init job)

---

## 🌐 Network

- **Network name:** `sobitas-project_sobitas-net` (external)
- **All containers on same network** - Can communicate with mysql, redis, etc.

---

**Solution is production-ready and does not modify existing infrastructure.**
