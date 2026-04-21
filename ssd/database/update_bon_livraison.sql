-- SQL Script to update "Bon de commande" to "Bon de livraison" in database
-- Run this in your production database after deploying the code changes

-- 1. Update data_types table (for list page title) - THIS IS CRITICAL FOR PAGE TITLE
UPDATE `data_types` 
SET 
    `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' 
   OR `name` = 'commandes'
   OR `slug` = 'factures'
   OR `name` = 'factures';

-- 2. Update menu_items table (for sidebar menu)
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index' 
   OR `route` LIKE '%commandes%'
   OR `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%';

-- 3. Update "Ajouter B.Commande" to "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` IS NOT NULL);

-- 4. Clear Voyager cache (you'll need to run this via Laravel command)
-- After running the SQL, execute: 
-- docker exec -it sobitas-backend php artisan cache:clear
-- docker exec -it sobitas-backend php artisan view:clear
-- docker exec -it sobitas-backend php artisan config:clear
