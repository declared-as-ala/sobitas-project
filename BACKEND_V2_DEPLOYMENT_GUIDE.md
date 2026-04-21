# Backend V2 Deployment Guide

## Overview

This guide explains how **Backend #2** (V2 instance) is set up alongside the existing **Backend #1** without any conflicts or downtime.

---

## Architecture Summary

### Port Allocation

| Service | Container Name | Internal Port | Exposed Port | Access |
|---------|---------------|---------------|--------------|--------|
| **Backend #1** | `sobitas-backend` | 9000 (PHP-FPM) | - | Internal only |
| **Backend #1 Nginx** | `sobitas-laravel-nginx` | 80 | **8081** | `http://145.223.118.9:8081` |
| **Backend #2** | `sobitas-backend-v2` | 9000 (PHP-FPM) | - | Internal only |
| **Backend #2 Nginx** | `sobitas-laravel-nginx-v2` | 80 | **8083** | `http://145.223.118.9:8083` |
| Frontend | `sobitas-frontend` | 3000 | **3001** | `http://145.223.118.9:3001` |
| MySQL | `sobitas-mysql` | 3306 | - | Internal only |
| Nginx Proxy Manager | `sobitas-npm` | 80/443 | **8080/8443** | `http://145.223.118.9:8080` |

### Key Points

- **Backend #1** remains **unchanged** and continues running on port **8081**
- **Backend #2** runs on port **8083** (no port conflicts)
- Both backends share the **same MySQL database** (`sobitas-mysql`)
- Both backends use the **same codebase** (`./backend` directory)
- Each backend has **separate Docker volumes** for vendor and cache (no conflicts)

---

## Initial Setup (One-Time)

### 1. Server Prerequisites

Ensure you're on the server (`root@145.223.118.9`) and have:
- Docker and Docker Compose installed
- Git repository cloned at `/root/SOBITAS-FULL-PROJECT`
- Existing services running (Backend #1, Frontend, MySQL, etc.)

### 2. Start Backend V2 Services

Navigate to your project directory:

```bash
cd /root/SOBITAS-FULL-PROJECT
```

Start only the Backend V2 services (Backend #1 stays running):

```bash
docker compose up -d backend-v2 laravel-nginx-v2
```

Verify they're running:

```bash
docker ps | grep -E "backend-v2|laravel-nginx-v2"
```

You should see:
- `sobitas-backend-v2` (PHP-FPM)
- `sobitas-laravel-nginx-v2` (Nginx on port 8083)

### 3. Run Laravel Setup (One-Time)

```bash
# Create storage link (if not already done)
docker compose exec backend-v2 php artisan storage:link

# Cache configuration
docker compose exec backend-v2 php artisan config:cache
docker compose exec backend-v2 php artisan route:cache
docker compose exec backend-v2 php artisan view:cache
```

### 4. Test Backend V2

Access Backend V2 directly:

```bash
curl http://localhost:8083/api/health
# or
curl http://145.223.118.9:8083/api/health
```

---

## CI/CD Auto-Deployment

### How It Works

When you **push code to GitHub** (main branch) with changes in:
- `backend/` directory
- `docker-compose.yml`
- `nginx/laravel-v2.conf`

The GitHub Actions workflow (`.github/workflows/backend-v2-deploy.yml`) automatically:

1. **SSHes to your server** (`root@145.223.118.9`)
2. **Pulls latest code** from GitHub
3. **Rebuilds** only the `backend-v2` Docker image
4. **Restarts** only `backend-v2` and `laravel-nginx-v2` containers
5. **Runs Laravel optimizations** (config cache, route cache, etc.)
6. **Cleans up** old Docker images

**Backend #1, Frontend, and other services are NOT affected.**

### Zero-Downtime Deployment

The workflow uses a **rolling restart** approach:
- New container starts first
- Old container stops after new one is healthy
- Nginx continues serving requests during the transition

### Required GitHub Secrets

Ensure these secrets are set in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Description | Example |
|--------|-------------|---------|
| `VPS_HOST` | Server IP address | `145.223.118.9` |
| `VPS_USER` | SSH username | `root` |
| `VPS_PASSWORD` | SSH password | `your_password` |
| `VPS_SSH_KEY` | (Optional) SSH private key | Full key content |

**Note:** Use either `VPS_PASSWORD` OR `VPS_SSH_KEY`, not both.

### Manual Trigger

You can manually trigger the deployment:

1. Go to **GitHub → Actions**
2. Select **Backend V2 Build & Deploy**
3. Click **Run workflow**

---

## Nginx Proxy Manager Configuration

### Mapping Domain to Backend V2

To expose Backend V2 via `api-v2.sobitas.tn`:

1. **Access Nginx Proxy Manager:**
   - URL: `http://145.223.118.9:81`
   - Login with your NPM credentials

2. **Add Proxy Host:**
   - Click **Proxy Hosts** → **Add Proxy Host**
   - **Details:**
     - Domain Names: `api-v2.sobitas.tn`
     - Scheme: `http`
     - Forward Hostname/IP: `sobitas-laravel-nginx-v2` (container name)
     - Forward Port: `80`
     - **Block Common Exploits:** ✓
     - **Websockets Support:** ✓ (if needed)

3. **SSL Certificate:**
   - Go to **SSL Certificates** tab
   - Select **Request a new SSL Certificate**
   - Choose **Let's Encrypt**
   - Domain: `api-v2.sobitas.tn`
   - Email: your email
   - **Force SSL:** ✓
   - **HTTP/2 Support:** ✓
   - Click **Save**

4. **Save Proxy Host:**
   - Click **Save**
   - Backend V2 is now accessible at `https://api-v2.sobitas.tn`

### Important Notes

- **SSL is handled by Nginx Proxy Manager** (not Laravel)
- Laravel should **NOT** have SSL configuration
- Backend V2 Nginx listens on port **80 internally** (not 443)
- NPM handles SSL termination and forwards to Backend V2 on port 80

---

## Container Management

### View Logs

```bash
# Backend V2 PHP-FPM logs
docker compose logs -f backend-v2

# Backend V2 Nginx logs
docker compose logs -f laravel-nginx-v2

# Both together
docker compose logs -f backend-v2 laravel-nginx-v2
```

### Restart Services

```bash
# Restart only Backend V2
docker compose restart backend-v2 laravel-nginx-v2

# Or stop and start
docker compose stop backend-v2 laravel-nginx-v2
docker compose start backend-v2 laravel-nginx-v2
```

### Rebuild After Code Changes

```bash
cd /root/SOBITAS-FULL-PROJECT
git pull origin main
docker compose build --no-cache backend-v2
docker compose up -d backend-v2 laravel-nginx-v2
```

### Check Container Status

```bash
# All containers
docker ps

# Only Backend V2 containers
docker ps | grep -E "backend-v2|laravel-nginx-v2"

# Container health
docker compose ps backend-v2 laravel-nginx-v2
```

---

## Troubleshooting

### Backend V2 Not Starting

1. **Check logs:**
   ```bash
   docker compose logs backend-v2
   ```

2. **Verify port 8083 is not in use:**
   ```bash
   netstat -tuln | grep 8083
   ```

3. **Check Docker network:**
   ```bash
   docker network inspect sobitas-net
   ```

### Database Connection Issues

Both backends connect to the same MySQL container (`sobitas-mysql`). If Backend V2 can't connect:

1. **Verify MySQL is running:**
   ```bash
   docker ps | grep mysql
   ```

2. **Check environment variables:**
   ```bash
   docker compose exec backend-v2 env | grep DB_
   ```

3. **Test connection:**
   ```bash
   docker compose exec backend-v2 php artisan tinker
   # Then: DB::connection()->getPdo();
   ```

### Nginx Configuration Issues

1. **Test Nginx config:**
   ```bash
   docker compose exec laravel-nginx-v2 nginx -t
   ```

2. **Reload Nginx:**
   ```bash
   docker compose exec laravel-nginx-v2 nginx -s reload
   ```

### Port Conflicts

If port 8083 is already in use:

1. **Find what's using it:**
   ```bash
   lsof -i :8083
   ```

2. **Change port in `docker-compose.yml`:**
   ```yaml
   laravel-nginx-v2:
     ports:
       - "8084:80"  # Change 8083 to 8084
   ```

3. **Restart:**
   ```bash
   docker compose up -d laravel-nginx-v2
   ```

---

## Summary

### Port Summary

- **Backend #1:** Port **8081** (unchanged)
- **Backend #2:** Port **8083** (new)

### Access Points

- **Direct access:** `http://145.223.118.9:8083`
- **Via NPM:** `https://api-v2.sobitas.tn` (after configuration)

### Frontend Connection

The frontend can connect to either backend:

- **Backend #1:** `https://admin.protein.tn/api` (existing)
- **Backend #2:** `https://api-v2.sobitas.tn/api` (new)

Update frontend environment variables to switch between backends.

---

## Next Steps

1. ✅ Backend V2 services added to `docker-compose.yml`
2. ✅ Nginx configuration created (`nginx/laravel-v2.conf`)
3. ✅ CI/CD workflow created (`.github/workflows/backend-v2-deploy.yml`)
4. ⏳ **Deploy to server:** Run initial setup commands
5. ⏳ **Configure NPM:** Map `api-v2.sobitas.tn` to Backend V2
6. ⏳ **Test:** Verify Backend V2 is accessible
7. ⏳ **Update frontend:** Point to Backend V2 if needed

---

## Questions?

If you encounter any issues:
1. Check container logs: `docker compose logs backend-v2 laravel-nginx-v2`
2. Verify ports: `netstat -tuln | grep -E "8081|8083"`
3. Test connectivity: `curl http://localhost:8083/api/health`
