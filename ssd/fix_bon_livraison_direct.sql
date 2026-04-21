-- Direct SQL Commands - Replace YOUR_DB_NAME, YOUR_DB_USER, YOUR_DB_PASSWORD with actual values
-- Or use the .env file values

-- Update data_types table (FIXES PAGE TITLE - This is the most important!)
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

-- Update menu_items - "Ajouter B.Commande" to "Ajouter Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR `title` LIKE '%Ajouter Bon Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` IS NOT NULL);

-- Update menu_items - "Bon De Commandes" to "Bon de livraison"
UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%'
   OR `title` LIKE '%Bons de commandes%'
   OR (`route` = 'voyager.factures.index' AND `parent_id` IS NOT NULL)
   OR (`route` = 'voyager.commandes.index' AND `parent_id` IS NOT NULL);

-- Remove standalone "Bon de livraison" menu item (if exists)
DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` NOT IN (
      SELECT `id` FROM `menu_items` WHERE `title` LIKE '%Facturations%Tickets%' OR `title` LIKE '%Facturation%Ticket%'
  ))
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');
