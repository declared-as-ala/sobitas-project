# Profiling Tools Setup Guide

This guide covers setting up Laravel Debugbar (already installed) and Laravel Telescope for performance monitoring and debugging.

## ⚠️ IMPORTANT: Development Only

**Never enable these tools in production!** They have significant performance overhead and can expose sensitive information.

---

## 1. Laravel Debugbar (Already Installed ✅)

### Current Status
- ✅ Installed in `composer.json` (require-dev)
- ✅ Config file exists: `config/debugbar.php`

### Configuration

Debugbar is automatically enabled when:
- `APP_DEBUG=true` in `.env`
- Environment is `local`

### Usage

1. **Access Debugbar:**
   - Visit any Filament page or API endpoint
   - Debugbar appears at the bottom of the page
   - Shows: queries, timeline, memory, exceptions, etc.

2. **Disable for Specific Routes:**
   ```php
   // In routes/api.php or routes/web.php
   \Debugbar::disable();
   ```

3. **Enable Only in Local:**
   ```php
   // In AppServiceProvider or .env
   // Already configured - only works when APP_DEBUG=true
   ```

### Docker Configuration

Debugbar works automatically in Docker when:
```env
APP_DEBUG=true
APP_ENV=local
```

### Verify It's Working

1. Visit: `http://localhost:8080/admin`
2. You should see a debug bar at the bottom
3. Click to see queries, timeline, etc.

---

## 2. Laravel Telescope (Recommended for Advanced Profiling)

### Installation

```bash
# Inside Docker container
docker exec -it sobitas-backend composer require laravel/telescope --dev

# Or from host (if composer is available)
cd filament
composer require laravel/telescope --dev
```

### Setup

```bash
# Publish Telescope assets and migrations
docker exec -it sobitas-backend php artisan telescope:install

# Run migrations
docker exec -it sobitas-backend php artisan migrate
```

### Configuration

1. **Update `.env`:**
   ```env
   TELESCOPE_ENABLED=true  # Only in local/staging
   ```

2. **Verify `config/telescope.php`:**
   - Should be auto-generated after installation
   - Check `enabled` setting matches environment

3. **Access Telescope:**
   - URL: `http://localhost:8080/telescope`
   - Shows: requests, queries, jobs, cache, etc.

### Docker Setup

Add to `docker-compose.yml` backend environment (optional):
```yaml
environment:
  TELESCOPE_ENABLED: "true"  # Only for local
```

### Telescope Features

- **Requests:** All HTTP requests with timing
- **Queries:** Database queries with execution time
- **Jobs:** Queue jobs execution
- **Cache:** Cache operations
- **Logs:** Application logs
- **Exceptions:** Error tracking
- **Dumps:** Variable dumps
- **Events:** Event listeners

### Pruning Old Data

Telescope stores data in database. Prune old records:

```bash
# Add to app/Console/Kernel.php schedule
$schedule->command('telescope:prune')->daily();

# Or run manually
docker exec -it sobitas-backend php artisan telescope:prune
```

---

## 3. Slow Query Logging

### Implementation

Add to `app/Providers/AppServiceProvider.php`:

```php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

public function boot(): void
{
    // ... existing code ...

    // ── Slow Query Logging (Local Only) ────────────────
    if ($this->app->environment('local')) {
        DB::listen(function ($query) {
            if ($query->time > 100) { // Log queries > 100ms
                Log::warning('Slow query detected', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'time' => $query->time . 'ms',
                    'connection' => $query->connectionName,
                ]);
            }
        });
    }
}
```

### View Slow Queries

```bash
# View Laravel logs
docker exec -it sobitas-backend tail -f storage/logs/laravel.log | grep "Slow query"

# Or check log file
docker exec -it sobitas-backend cat storage/logs/laravel.log | grep "Slow query"
```

---

## 4. MySQL Slow Query Log

### Enable in Docker

Add to `docker-compose.yml` MySQL service:

```yaml
mysql:
  environment:
    # ... existing ...
    MYSQL_SLOW_QUERY_LOG: "1"
    MYSQL_LONG_QUERY_TIME: "1"  # Log queries > 1 second
```

Or configure in MySQL:

```bash
# Connect to MySQL
docker exec -it sobitas-mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD}

# Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/lib/mysql/slow-query.log';
```

### View Slow Query Log

```bash
# From host
docker exec -it sobitas-mysql cat /var/lib/mysql/slow-query.log

# Or mount volume to access from host
# Add to docker-compose.yml mysql volumes:
# - ./mysql-slow-logs:/var/lib/mysql
```

---

## 5. Performance Monitoring Checklist

### Development (Local)

- [x] Laravel Debugbar enabled (automatic with APP_DEBUG=true)
- [ ] Laravel Telescope installed and configured
- [ ] Slow query logging enabled in AppServiceProvider
- [ ] MySQL slow query log enabled (optional)

### Staging

- [ ] Telescope enabled (for testing)
- [ ] Debugbar disabled (APP_DEBUG=false)
- [ ] Slow query logging enabled
- [ ] Monitor Telescope dashboard regularly

### Production

- [ ] Telescope disabled (TELESCOPE_ENABLED=false)
- [ ] Debugbar disabled (APP_DEBUG=false)
- [ ] Use Laravel Pulse or external APM (New Relic, Datadog)
- [ ] MySQL slow query log enabled
- [ ] Set up alerts for slow queries

---

## 6. Quick Setup Commands

### Full Setup (Development)

```bash
# 1. Install Telescope
docker exec -it sobitas-backend composer require laravel/telescope --dev
docker exec -it sobitas-backend php artisan telescope:install
docker exec -it sobitas-backend php artisan migrate

# 2. Enable in .env
echo "TELESCOPE_ENABLED=true" >> .env

# 3. Clear config cache
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan config:cache

# 4. Access Telescope
# Visit: http://localhost:8080/telescope
```

### Verify Setup

```bash
# Check Debugbar
curl -I http://localhost:8080/admin
# Should see X-Debugbar-* headers if enabled

# Check Telescope
curl -I http://localhost:8080/telescope
# Should return 200 if installed

# Check slow query logging
docker exec -it sobitas-backend tail -f storage/logs/laravel.log
# Make a slow query, should see log entry
```

---

## 7. Troubleshooting

### Debugbar Not Showing

1. Check `APP_DEBUG=true` in `.env`
2. Check `APP_ENV=local` in `.env`
3. Clear config: `php artisan config:clear`
4. Check browser console for errors
5. Verify package is installed: `composer show barryvdh/laravel-debugbar`

### Telescope Not Accessible

1. Check `TELESCOPE_ENABLED=true` in `.env`
2. Verify migrations ran: `php artisan migrate:status`
3. Check route exists: `php artisan route:list | grep telescope`
4. Clear config cache: `php artisan config:clear`
5. Check permissions on `storage/telescope` directory

### Slow Query Logging Not Working

1. Verify code is in `AppServiceProvider::boot()`
2. Check `APP_ENV=local` in `.env`
3. Check log file permissions: `storage/logs/laravel.log`
4. Test with a deliberately slow query
5. Check Laravel log level in `config/logging.php`

---

## 8. Best Practices

1. **Only in Development:**
   - Never enable Telescope/Debugbar in production
   - Use environment-based configuration
   - Check `APP_ENV` before enabling

2. **Performance Impact:**
   - Debugbar: ~50-100ms overhead per request
   - Telescope: ~100-200ms overhead per request
   - Both store data in database/files

3. **Data Retention:**
   - Prune Telescope data regularly
   - Clear Debugbar cache periodically
   - Archive slow query logs

4. **Security:**
   - Protect Telescope route with authentication
   - Don't expose sensitive data in dumps
   - Use `.env` to control access

---

## 9. Alternative: Laravel Pulse (Production Monitoring)

For production, consider Laravel Pulse (Laravel 11+):

```bash
composer require laravel/pulse
php artisan pulse:install
php artisan migrate
```

Pulse provides:
- Real-time performance monitoring
- Low overhead (designed for production)
- Dashboard at `/pulse`
- Tracks: requests, slow queries, jobs, etc.

---

**Status:** ✅ Debugbar ready | ⚠️ Telescope needs installation  
**Next Step:** Install Telescope for advanced profiling
