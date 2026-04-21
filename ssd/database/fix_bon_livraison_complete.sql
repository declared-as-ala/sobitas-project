-- Complete SQL Script to Fix All "Bon de commande" to "Bon de livraison"
-- Run this in your production database

-- Step 1: Update data_types table (This controls the page title)
UPDATE `data_types` 
SET 
    `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' 
   OR `name` = 'commandes'
   OR `slug` = 'factures'
   OR `name` = 'factures';

-- Step 2: Update menu_items - "Ajouter B.Commande" to "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR `title` LIKE '%Ajouter Bon Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` IS NOT NULL);

-- Step 3: Update menu_items - "Bon De Commandes" to "Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%'
   OR `title` LIKE '%Bons de commandes%'
   OR (`route` = 'voyager.factures.index' AND `parent_id` IS NOT NULL)
   OR (`route` = 'voyager.commandes.index' AND `parent_id` IS NOT NULL);

-- Step 4: Remove standalone "Bon de livraison" menu item (if exists as top-level)
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` NOT IN (
      SELECT `id` FROM (SELECT `id` FROM `menu_items` WHERE `title` LIKE '%Facturations%Tickets%' OR `title` LIKE '%Facturation%Ticket%') AS temp
  ))
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');

-- Step 5: Verify the updates (optional - just to check)
-- SELECT * FROM `data_types` WHERE `slug` = 'commandes' OR `name` = 'commandes';
-- SELECT * FROM `menu_items` WHERE `title` LIKE '%livraison%' OR `route` LIKE '%commandes%';

-- After running this SQL, clear cache:
-- docker exec -it sobitas-backend php artisan cache:clear
-- docker exec -it sobitas-backend php artisan view:clear
-- docker exec -it sobitas-backend php artisan config:clear
