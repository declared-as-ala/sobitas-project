-- Quick Fix: Update page title from "Bon de commandes" to "Bons de livraison"
-- This fixes the title that appears at the top of the list page

-- Update data_types table (THIS CONTROLS THE PAGE TITLE)
UPDATE `data_types` 
SET 
    `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' 
   OR `name` = 'commandes';

-- Verify the update
SELECT `id`, `name`, `slug`, `display_name_singular`, `display_name_plural` 
FROM `data_types` 
WHERE `slug` = 'commandes' OR `name` = 'commandes';
