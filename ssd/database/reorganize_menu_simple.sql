-- Simple SQL Script to Reorganize Menu for Bon de livraison
-- Run this in your production database

-- Step 1: Update "Ajouter B.Commande" to "Ajouter Bon de livraison"
-- (This item has id=25, parent_id=26 based on your database structure)
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `id` = 25 
   OR (`title` LIKE '%Ajouter B.Commande%' AND `parent_id` = 26)
   OR (`route` = 'voyager.facture' AND `parent_id` = 26);

-- Step 2: Update "Bon De Commandes" to "Bon de livraison"  
-- (This item has id=14, parent_id=26 based on your database structure)
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `id` = 14
   OR (`title` LIKE '%Bon De Commandes%' AND `parent_id` = 26)
   OR (`title` LIKE '%Bon de commandes%' AND `parent_id` = 26)
   OR (`route` = 'voyager.factures.index' AND `parent_id` = 26);

-- Step 3: Remove standalone "Bon de livraison" menu item if it exists
-- (Items that are NOT under "Facturations & Tickets" parent)
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` != 26)
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');

-- Step 4: Update any commandes routes to use correct title
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index'
   AND `title` != 'Bon de livraison';

-- After running this SQL, clear cache:
-- docker exec -it sobitas-backend php artisan cache:clear
