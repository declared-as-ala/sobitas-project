# 🔴 URGENT FIX - Page Title Still Shows "Bon de commandes"

## Quick Fix - Run These Commands:

### Step 1: Update Database (CRITICAL!)

```bash
cd backend

# Read credentials from .env
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

# Run SQL to fix page title
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "UPDATE \`data_types\` SET \`display_name_singular\` = 'Bon de livraison', \`display_name_plural\` = 'Bons de livraison' WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';"
```

### Step 2: Clear ALL Caches and Compiled Views

```bash
# Remove ALL compiled views (this is important!)
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"

# Clear all caches
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan route:clear
docker exec -it sobitas-backend php artisan optimize:clear
```

### Step 3: Verify Database Update

```bash
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT \`id\`, \`name\`, \`slug\`, \`display_name_singular\`, \`display_name_plural\` FROM \`data_types\` WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';"
```

You should see:
- `display_name_singular` = 'Bon de livraison'
- `display_name_plural` = 'Bons de livraison'

---

## Alternative: Manual MySQL Connection

If the script doesn't work, connect manually:

```bash
docker exec -it sobitas-mysql mysql -u root -p
```

Then run:
```sql
USE your_database_name;

UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

-- Verify
SELECT `id`, `name`, `slug`, `display_name_singular`, `display_name_plural` 
FROM `data_types` 
WHERE `slug` = 'commandes' OR `name` = 'commandes';

exit;
```

Then clear caches:
```bash
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php && php artisan optimize:clear"
```

---

## After Running:

1. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check the page** - title should now show "Bons de livraison"
3. **If still showing old text**, the compiled views are cached - run the cache clear commands again
