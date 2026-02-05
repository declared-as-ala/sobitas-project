# 🔧 Complete Fix for Bon de livraison

## Run this ONE command to fix everything:

```bash
cd backend
chmod +x fix_all_bon_livraison.sh
./fix_all_bon_livraison.sh
```

This script will:
1. ✅ Update `data_types` table (fixes page title "Bon de commandes" → "Bons de livraison")
2. ✅ Update menu items (sidebar menu)
3. ✅ Clear all caches
4. ✅ Remove compiled views
5. ✅ Show verification results

---

## Or run SQL manually:

```bash
# Read credentials from .env
cd backend
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

# Run SQL
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < fix_all_bon_livraison_complete.sql

# Clear caches
docker exec -it sobitas-backend php artisan optimize:clear
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
```

---

## After running:

1. **Refresh browser** with hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check page title** - should show "Bons de livraison"
3. **Check print view** - should show "Bon de livraison"

---

## If still showing old text:

The compiled views might be cached. Run:

```bash
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php && php artisan view:clear"
```

Then refresh your browser again.
