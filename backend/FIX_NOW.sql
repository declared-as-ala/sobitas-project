-- URGENT FIX: Update page title from "Bon de commandes" to "Bons de livraison"
-- Copy and paste this entire block into MySQL

UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

-- Verify it worked:
SELECT `id`, `name`, `slug`, `display_name_singular`, `display_name_plural` 
FROM `data_types` 
WHERE `slug` = 'commandes' OR `name` = 'commandes';
