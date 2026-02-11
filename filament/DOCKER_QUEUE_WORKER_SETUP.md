# Docker Queue Worker Setup Guide

## Overview

Since we're using Redis for queues, we need to run queue workers to process jobs. This guide shows how to set up queue workers in Docker.

## Option 1: Manual Queue Worker (Development)

### Run Queue Worker in Existing Container

```bash
# Start queue worker in backend container
docker exec -it sobitas-backend php artisan queue:work redis --sleep=3 --tries=3 --timeout=90

# Or run in background
docker exec -d sobitas-backend php artisan queue:work redis --sleep=3 --tries=3 --timeout=90
```

**Note:** This stops when container restarts. Use Option 2 for production.

---

## Option 2: Dedicated Queue Worker Service (Production)

### Add to docker-compose.yml

Add this service to your `docker-compose.yml`:

```yaml
  # -------------------------
  # Queue Worker
  # -------------------------
  queue-worker:
    build:
      context: ./filament
      dockerfile: Dockerfile
    container_name: sobitas-queue-worker
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: ${MYSQL_DATABASE:-protein_db}
      DB_USERNAME: ${MYSQL_USER:-laravel}
      DB_PASSWORD: ${MYSQL_PASSWORD:-secret}
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD:-}
      REDIS_PORT: 6379
      QUEUE_CONNECTION: redis
      APP_ENV: ${APP_ENV:-local}
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --timeout=90
    networks:
      - sobitas-net
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./filament:/var/www/html:delegated
      - backend-vendor:/var/www/html/vendor
      - backend-bootstrap-cache:/var/www/html/bootstrap/cache
    healthcheck:
      test: ["CMD-SHELL", "ps aux | grep 'queue:work' | grep -v grep || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Start Queue Worker

```bash
# Start all services including queue worker
docker-compose up -d

# Or start just queue worker
docker-compose up -d queue-worker

# Check status
docker ps | grep queue-worker

# View logs
docker logs -f sobitas-queue-worker
```

---

## Option 3: Multiple Queue Workers (High Volume)

For high-volume applications, run multiple workers:

```yaml
  queue-worker-1:
    # ... same config as above ...
    container_name: sobitas-queue-worker-1

  queue-worker-2:
    # ... same config as above ...
    container_name: sobitas-queue-worker-2
```

Or use Docker Compose scaling:

```bash
docker-compose up -d --scale queue-worker=3
```

---

## Queue Worker Options Explained

```bash
php artisan queue:work redis \
  --sleep=3 \          # Seconds to wait when no jobs available
  --tries=3 \          # Number of times to retry failed jobs
  --max-time=3600 \    # Maximum seconds worker runs before restart
  --timeout=90 \       # Maximum seconds a job can run
  --queue=default \    # Queue name (default is 'default')
  --memory=128 \       # Memory limit in MB (restart if exceeded)
```

---

## Monitoring Queue Workers

### Check Queue Status

```bash
# Check Redis queue length
docker exec -it sobitas-redis redis-cli LLEN queues:default

# View pending jobs
docker exec -it sobitas-redis redis-cli LRANGE queues:default 0 -1

# Check failed jobs
docker exec -it sobitas-backend php artisan queue:failed

# Retry failed jobs
docker exec -it sobitas-backend php artisan queue:retry all
```

### View Worker Logs

```bash
# Real-time logs
docker logs -f sobitas-queue-worker

# Last 100 lines
docker logs --tail 100 sobitas-queue-worker

# Logs with timestamps
docker logs -f --timestamps sobitas-queue-worker
```

### Check Worker Health

```bash
# Check if worker is running
docker ps | grep queue-worker

# Check worker process
docker exec -it sobitas-queue-worker ps aux | grep queue:work

# Check health status
docker inspect sobitas-queue-worker | grep -A 10 Health
```

---

## Testing Queue

### 1. Dispatch a Test Job

```bash
# In tinker
docker exec -it sobitas-backend php artisan tinker

# Dispatch test job
dispatch(function () {
    \Log::info('Test job executed');
});
```

### 2. Verify Job is Processed

```bash
# Check logs
docker logs sobitas-queue-worker | grep "Test job executed"

# Or check Laravel logs
docker exec -it sobitas-backend tail -f storage/logs/laravel.log
```

### 3. Test Real Job (SMS from CommandeResource)

1. Go to Filament admin: `http://localhost:8080/admin`
2. Open a Commande
3. Click "SMS" action
4. Check queue worker logs: `docker logs -f sobitas-queue-worker`

---

## Troubleshooting

### Issue: Queue Worker Not Processing Jobs

1. **Check worker is running:**
   ```bash
   docker ps | grep queue-worker
   ```

2. **Check Redis connection:**
   ```bash
   docker exec -it sobitas-queue-worker php artisan tinker
   # Then: Cache::put('test', 'ok');
   ```

3. **Check queue connection:**
   ```bash
   docker exec -it sobitas-queue-worker env | grep QUEUE_CONNECTION
   # Should be: QUEUE_CONNECTION=redis
   ```

4. **Check for errors:**
   ```bash
   docker logs sobitas-queue-worker | grep -i error
   ```

### Issue: Jobs Failing

1. **Check failed jobs:**
   ```bash
   docker exec -it sobitas-backend php artisan queue:failed
   ```

2. **View failure details:**
   ```bash
   docker exec -it sobitas-backend php artisan queue:failed-table
   docker exec -it sobitas-backend php artisan migrate
   docker exec -it sobitas-backend php artisan queue:failed
   ```

3. **Retry failed jobs:**
   ```bash
   docker exec -it sobitas-backend php artisan queue:retry all
   ```

### Issue: Worker Keeps Restarting

1. **Check memory usage:**
   ```bash
   docker stats sobitas-queue-worker
   ```

2. **Check logs for errors:**
   ```bash
   docker logs sobitas-queue-worker
   ```

3. **Increase memory limit:**
   ```yaml
   command: php artisan queue:work redis --memory=256
   ```

---

## Production Recommendations

1. **Use dedicated queue worker service** (Option 2)
2. **Run multiple workers** for high volume
3. **Set up monitoring** (Laravel Pulse, external APM)
4. **Set up alerts** for failed jobs
5. **Regularly check** `queue:failed` table
6. **Monitor Redis memory** usage
7. **Set appropriate timeouts** based on job complexity

---

## Quick Commands Reference

```bash
# Start queue worker
docker-compose up -d queue-worker

# Stop queue worker
docker-compose stop queue-worker

# Restart queue worker
docker-compose restart queue-worker

# View logs
docker logs -f sobitas-queue-worker

# Check queue length
docker exec -it sobitas-redis redis-cli LLEN queues:default

# Clear failed jobs
docker exec -it sobitas-backend php artisan queue:flush

# Retry all failed jobs
docker exec -it sobitas-backend php artisan queue:retry all
```

---

**Status:** ✅ Configuration ready  
**Next Step:** Add queue-worker service to docker-compose.yml and start it
