# Production Update Commands

After updating the backend views, run these commands to refresh the cache and update the database:

## Step 1: Update Database (IMPORTANT!)

### ⚠️ FIX PAGE TITLE: "Bon de commandes" → "Bons de livraison"

**This is the most important step to fix the page title!**

```bash
# Connect to MySQL
docker exec -it sobitas-mysql mysql -u root -p

# Then run:
USE your_database_name;

-- Update data_types (THIS FIXES THE PAGE TITLE)
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

exit;
```

### Option A: Run Complete SQL Script

```bash
# Use the complete fix script
docker exec -i sobitas-mysql mysql -u root -pYOUR_PASSWORD your_database_name < backend/database/fix_bon_livraison_complete.sql

# Or manually:
docker exec -it sobitas-mysql mysql -u root -p
USE your_database_name;

UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index' OR `route` LIKE '%commandes%';

UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%';

exit;
```

### Option B: Run SQL from command line (one-liner)

```bash
docker exec -it sobitas-mysql mysql -u root -pYOUR_PASSWORD -e "USE your_database_name; UPDATE data_types SET display_name_singular = 'Bon de livraison', display_name_plural = 'Bons de livraison' WHERE slug = 'commandes' OR name = 'commandes'; UPDATE menu_items SET title = 'Bons de livraison' WHERE route = 'voyager.commandes.index' OR route LIKE '%commandes%';"
```

### Option C: If artisan command is available

First, make sure the command file is deployed, then:

```bash
# Clear command cache first
docker exec -it sobitas-backend php artisan clear-compiled
docker exec -it sobitas-backend php artisan optimize:clear

# Then run the command
docker exec -it sobitas-backend php artisan update:bon-livraison
```

## Step 2: Clear All Caches

After updating the database, clear all caches:

```bash
docker exec -it sobitas-backend php artisan optimize:clear
```

Or individually:
```bash
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan route:clear
```

## Quick Reference - Complete Update Process:

### Update Menu Structure (Bon de livraison reorganization):

```bash
# Option 1: Using artisan command (if available)
docker exec -it sobitas-backend php artisan menu:reorganize-bon-livraison

# Option 2: Using SQL directly
docker exec -i sobitas-mysql mysql -u root -pYOUR_PASSWORD your_database_name < backend/database/reorganize_menu_bon_livraison.sql

# Then clear caches
docker exec -it sobitas-backend php artisan optimize:clear
```

### Update Data Types and Menu Titles:

```bash
# 1. Update database via MySQL
docker exec -it sobitas-mysql mysql -u root -pYOUR_PASSWORD your_database_name -e "
UPDATE data_types 
SET display_name_singular = 'Bon de livraison',
    display_name_plural = 'Bons de livraison'
WHERE slug = 'commandes' OR name = 'commandes';

UPDATE menu_items 
SET title = 'Bon de livraison'
WHERE route = 'voyager.commandes.index' OR route LIKE '%commandes%';
"

# 2. Clear caches
docker exec -it sobitas-backend php artisan optimize:clear
```

## After Running Commands:

1. ✅ The database will be updated with "Bon de livraison" 
2. ✅ The sidebar menu will show "Bons de livraison"
3. ✅ The list page title will show "Bons de livraison"
4. ✅ The Blade templates will be recompiled
5. ✅ The dashboard buttons will show "BL" instead of "BC"
6. ✅ The print view will display "Bon de livraison"

## Note:

If you're using a queue system, you might also want to:
```bash
docker exec -it sobitas-backend php artisan queue:restart
```
