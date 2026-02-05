-- Complete SQL Script to Fix Historique and Menu Issues
-- This script will:
-- 1. Update data_types for page title
-- 2. Reorganize menu: Remove standalone "Bon de livraison" and ensure it's under "Facturations & Tickets"
-- 3. Update menu item titles

-- ============================================
-- STEP 1: Fix Page Title (data_types table)
-- ============================================
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

-- ============================================
-- STEP 2: Update Menu Items Under "Facturations & Tickets"
-- ============================================
-- Update "Ajouter B.Commande" → "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR `title` LIKE '%Ajouter Bon Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` = 26);

-- Update "Bon De Commandes" → "Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%'
   OR `title` LIKE '%Bons de commandes%'
   OR (`route` = 'voyager.factures.index' AND `parent_id` = 26)
   OR (`route` = 'voyager.commandes.index' AND `parent_id` = 26);

-- ============================================
-- STEP 3: Remove Standalone "Bon de livraison" Menu Item
-- ============================================
-- Delete any "Bon de livraison" menu items that are NOT under "Facturations & Tickets" (parent_id = 26)
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` != 26)
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');

-- ============================================
-- STEP 4: Ensure All Commandes Routes Use Correct Title
-- ============================================
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index'
   AND `title` != 'Bon de livraison'
   AND `parent_id` = 26;
