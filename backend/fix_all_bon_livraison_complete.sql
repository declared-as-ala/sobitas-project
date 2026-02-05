-- Complete SQL Fix for Bon de livraison
-- Run this to fix both page title and menu items

-- ============================================
-- STEP 1: Fix Page Title (data_types table)
-- ============================================
-- This is CRITICAL - it fixes "Bon de commandes" → "Bons de livraison" on the list page
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

-- ============================================
-- STEP 2: Fix Menu Items
-- ============================================
-- Update "Ajouter B.Commande" → "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR `title` LIKE '%Ajouter Bon Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` IS NOT NULL);

-- Update "Bon De Commandes" → "Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%'
   OR `title` LIKE '%Bons de commandes%'
   OR (`route` = 'voyager.factures.index' AND `parent_id` IS NOT NULL)
   OR (`route` = 'voyager.commandes.index' AND `parent_id` IS NOT NULL);

-- Remove standalone "Bon de livraison" menu item (if exists as top-level)
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` NOT IN (
      SELECT `id` FROM `menu_items` WHERE `title` LIKE '%Facturations%Tickets%' OR `title` LIKE '%Facturation%Ticket%'
  ))
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');

-- ============================================
-- VERIFICATION (optional - to check results)
-- ============================================
-- Uncomment to verify:
-- SELECT 'data_types:' as '';
-- SELECT `id`, `name`, `slug`, `display_name_singular`, `display_name_plural` 
-- FROM `data_types` 
-- WHERE `slug` = 'commandes' OR `name` = 'commandes';
-- 
-- SELECT 'menu_items:' as '';
-- SELECT `id`, `title`, `route`, `parent_id` 
-- FROM `menu_items` 
-- WHERE `title` LIKE '%livraison%' OR `route` LIKE '%commandes%';
