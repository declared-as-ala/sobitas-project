-- Fix Page Title for /admin/factures route
-- This updates the data_types table for BOTH 'factures' and 'commandes' slugs

UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'factures' OR `name` = 'factures'
   OR `slug` = 'commandes' OR `name` = 'commandes';

-- Verify the update
SELECT id, name, slug, display_name_singular, display_name_plural 
FROM data_types 
WHERE slug IN ('factures', 'commandes') OR name IN ('factures', 'commandes');
