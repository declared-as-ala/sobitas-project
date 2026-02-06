# Fix Dashboard Errors

## Issues Fixed

### 1. ❌ Relationship Error: `Call to undefined relationship [client] on model [App\Commande]`

**Problem:** The `Commande` model doesn't have a `client()` relationship. It stores client data directly in fields like `nom`, `prenom`, `phone`, `email`.

**Solution:** 
- ✅ Removed `with('client')` eager loading from Commande queries
- ✅ Updated view to use `$commande->nom` and `$commande->phone` instead of `$commande->client->nom`

### 2. ❌ Permission Error: `Permission denied` for `/var/www/html/storage/logs/laravel.log`

**Problem:** Laravel cannot write to the log file due to incorrect file permissions.

**Solution:** Run the fix script on your server.

## How to Fix on Server

### Step 1: Pull Latest Code
```bash
cd /root/sobitas-project
git pull origin main
```

### Step 2: Fix Storage Permissions
```bash
cd backend
chmod +x FIX_STORAGE_PERMISSIONS.sh
./FIX_STORAGE_PERMISSIONS.sh
```

Or manually:
```bash
# Inside Docker container
docker compose exec backend-v2 chmod -R 775 storage bootstrap/cache
docker compose exec backend-v2 chown -R www-data:www-data storage bootstrap/cache
docker compose exec backend-v2 touch storage/logs/laravel.log
docker compose exec backend-v2 chmod 664 storage/logs/laravel.log
docker compose exec backend-v2 chown www-data:www-data storage/logs/laravel.log
```

### Step 3: Clear Cache
```bash
docker compose exec backend-v2 php artisan cache:clear
docker compose exec backend-v2 php artisan view:clear
docker compose exec backend-v2 php artisan config:clear
```

### Step 4: Verify
Visit: https://admin.sobitas.tn/admin

The dashboard should now load without errors!

## What Was Changed

1. **DashboardController.php:**
   - Removed `with('client')` from Commande queries
   - Added try-catch for Ticket relationship (in case it doesn't exist)

2. **index.blade.php:**
   - Changed `$commande->client->nom` to `$commande->nom . ' ' . $commande->prenom`
   - Changed `$commande->client->tel` to `$commande->phone`

3. **FIX_STORAGE_PERMISSIONS.sh:**
   - New script to fix storage permissions automatically

## Notes

- `Commande` model stores client info directly (no foreign key relationship)
- `Facture` and `FactureTva` models DO have `client()` relationships
- `Ticket` model has a `client()` relationship
- Storage permissions must be set correctly for Laravel to write logs
