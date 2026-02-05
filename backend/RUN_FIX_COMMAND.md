# Commandes pour corriger "Bon de livraison"

## Option 1: Script automatique (recommandé)

### Sur Linux/Mac:
```bash
cd backend
chmod +x fix_bon_livraison.sh
./fix_bon_livraison.sh
```

### Sur Windows (PowerShell):
```powershell
cd backend
.\fix_bon_livraison.ps1
```

## Option 2: Commande directe avec vos identifiants

Remplacez `YOUR_DB_NAME`, `YOUR_DB_USER`, `YOUR_DB_PASSWORD` par les valeurs de votre `.env`:

```bash
docker exec -i sobitas-mysql mysql -u YOUR_DB_USER -pYOUR_DB_PASSWORD YOUR_DB_NAME << EOF
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';

UPDATE \`menu_items\` 
SET \`title\` = 'Ajouter Bon de livraison'
WHERE \`title\` LIKE '%Ajouter B.Commande%'
   OR (\`route\` = 'voyager.facture' AND \`parent_id\` IS NOT NULL);

UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`title\` LIKE '%Bon De Commandes%'
   OR \`title\` LIKE '%Bon de commandes%'
   OR (\`route\` = 'voyager.commandes.index' AND \`parent_id\` IS NOT NULL);

DELETE FROM \`menu_items\` 
WHERE (\`title\` = 'Bon de livraison' OR \`title\` = 'Bons de livraison')
  AND \`parent_id\` IS NULL
  AND \`route\` LIKE '%commandes%';
EOF

# Puis vider le cache
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear
```

## Option 3: Lecture depuis .env (Linux/Mac)

```bash
cd backend
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < fix_bon_livraison_direct.sql

docker exec -it sobitas-backend php artisan optimize:clear
```
