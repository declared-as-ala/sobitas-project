-- SQL Script to reorganize menu items for Bon de livraison
-- This script will:
-- 1. Update "Ajouter B.Commande" to "Ajouter Bon de livraison"
-- 2. Update "Bon De Commandes" to "Bon de livraison"
-- 3. Remove standalone "Bon de livraison" menu item (if exists)
-- 4. Ensure proper ordering under "Facturations & Tickets"

-- Step 1: Find the parent menu item "Facturations & Tickets" (usually has id = 26)
-- You may need to adjust this ID based on your database

-- Step 2: Update "Ajouter B.Commande" to "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` = 'Ajouter B.Commande' 
   OR `title` LIKE '%Ajouter B.Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` IS NOT NULL);

-- Step 3: Update "Bon De Commandes" to "Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` = 'Bon De Commandes' 
   OR `title` = 'Bon de commandes'
   OR `title` = 'Bons de commandes'
   OR (`route` = 'voyager.factures.index' AND `parent_id` IS NOT NULL);

-- Step 4: Remove standalone "Bon de livraison" menu item (if it exists as a top-level item)
-- This removes items that are NOT under "Facturations & Tickets" parent
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` NOT IN (
      SELECT `id` FROM `menu_items` WHERE `title` LIKE '%Facturations%Tickets%' OR `title` LIKE '%Facturation%Ticket%'
  ))
  AND `route` LIKE '%commandes%';

-- Step 5: Update menu items for commandes to use correct titles
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index'
   OR `route` LIKE '%commandes.index%';

-- Step 6: Ensure proper ordering under "Facturations & Tickets"
-- Adjust order values to place Bon de livraison items correctly
-- This assumes "Facturations & Tickets" has parent_id = NULL and other items have parent_id pointing to it

-- Optional: If you need to set specific order, uncomment and adjust:
-- UPDATE `menu_items` 
-- SET `order` = 1
-- WHERE `title` = 'Ajouter Bon de livraison' AND `parent_id` = 26;
-- 
-- UPDATE `menu_items` 
-- SET `order` = 2
-- WHERE `title` = 'Bon de livraison' AND `parent_id` = 26;

-- Step 7: Clear cache (run this via Laravel command after SQL)
-- After running the SQL, execute: php artisan cache:clear
