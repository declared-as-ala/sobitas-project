# Storage Volume Migration - Step by Step

## 🎯 Goal
Move `storage/` from slow Windows bind mount to fast Linux named volume to eliminate 37s file write bottleneck.

## 📋 Pre-Migration Checklist

- [x] Updated `docker-compose.yml` with `backend-storage` named volume
- [x] Updated `LOG_CHANNEL=stderr` in docker-compose.yml
- [x] Updated `DisableFileLoggingForApi` middleware to use `stderr`
- [x] Updated Nginx to use named volume for storage
- [x] Created filesystem benchmark script
- [x] Verified current performance (37s writes ❌)

## 🚀 Migration Steps

### Step 1: Backup Current Storage (Optional but Recommended)
```bash
# Create backup of current storage directory
docker exec sobitas-backend tar -czf /tmp/storage-backup.tar.gz -C /var/www/html storage
docker cp sobitas-backend:/tmp/storage-backup.tar.gz ./storage-backup-$(date +%Y%m%d).tar.gz
```

### Step 2: Stop All Containers
```bash
docker-compose down
```

### Step 3: Rebuild Backend Container
```bash
docker-compose build backend
```

### Step 4: Start Containers
```bash
docker-compose up -d
```

### Step 5: Wait for Services to Be Healthy
```bash
# Check container status
docker-compose ps

# Wait for all services to be healthy (especially backend)
docker-compose logs -f backend
# Press Ctrl+C when you see "✅ Laravel Filament backend ready!"
```

### Step 6: Verify Storage is on Named Volume
```bash
# Check storage location inside container
docker exec sobitas-backend sh -c "realpath /var/www/html/storage && df -h /var/www/html/storage"

# Expected output should show:
# /var/lib/docker/volumes/sobitas-project_backend-storage/_data
# (or similar Docker volume path)
```

### Step 7: Run Filesystem Benchmark
```bash
docker exec sobitas-backend php tests/filesystem_benchmark.php
```

**Expected Results:**
- ✅ `file_exists` 5000x: < 0.1s (was 24.5s)
- ✅ `file_put_contents` 1000x: < 1.0s (was 37.9s)
- ✅ Storage on named volume: YES

### Step 8: Verify Log Channel
```bash
docker exec sobitas-backend php artisan tinker
>>> config('logging.default')
# Should return: "stderr"
```

### Step 9: Run Route Benchmarks
```powershell
# Compare routes (normal vs fast)
.\filament\tests\compare_routes.ps1

# Parallel benchmark (30 sequential)
.\filament\tests\benchmark_parallel.ps1
```

**Expected Results:**
- ✅ `/api/all_products_fast`: Max < 400ms, Avg < 300ms
- ✅ No spikes (2-6s outliers eliminated)
- ✅ All requests stable

## 🔍 Troubleshooting

### Issue: Storage Still on Bind Mount
**Symptom:** `realpath /var/www/html/storage` shows `/var/www/html/storage` (not Docker volume path)

**Fix:**
1. Ensure `backend-storage` volume is defined in `volumes:` section
2. Ensure `backend-storage:/var/www/html/storage` is in backend `volumes:` section
3. Ensure `backend-storage:/var/www/html/storage` is in nginx `volumes:` section
4. Rebuild: `docker-compose down && docker-compose build && docker-compose up -d`

### Issue: Permission Errors
**Symptom:** `Permission denied` when writing to storage

**Fix:**
```bash
# Fix permissions inside container
docker exec sobitas-backend chown -R www-data:www-data /var/www/html/storage
docker exec sobitas-backend chmod -R 775 /var/www/html/storage
```

### Issue: Files Missing After Migration
**Symptom:** Storage files not visible after migration

**Fix:**
1. Check if files are in old bind mount location
2. Copy files from bind mount to named volume:
   ```bash
   docker exec sobitas-backend cp -r /var/www/html/storage/* /tmp/storage-backup/
   # Then restore from backup if needed
   ```

## 📊 Success Criteria

After migration, verify:

- [ ] `file_put_contents` 1000x: < 1.0s ✅
- [ ] Storage on named volume: YES ✅
- [ ] `/api/all_products_fast`: Max < 400ms ✅
- [ ] No spikes in 30 sequential requests ✅
- [ ] Filament page navigation smooth ✅
- [ ] `LOG_CHANNEL=stderr` verified ✅

## 📝 Notes

1. **Data Persistence:** Named volumes persist even if containers are removed
2. **Backup:** Always backup before migration
3. **Permissions:** Named volumes maintain proper permissions automatically
4. **Performance:** Named volumes use Linux filesystem (100x faster than Windows bind mounts)

---

**Status:** ✅ Configuration ready  
**Next:** Run migration steps  
**Date:** 2026-02-09
