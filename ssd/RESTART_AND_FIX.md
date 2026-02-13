# 🔴 Complete Fix with Backend Restart

## Run This Command:

```bash
cd backend
chmod +x FIX_AND_RESTART.sh
./FIX_AND_RESTART.sh
```

This will:
1. ✅ Update `data_types` table (fixes page title)
2. ✅ Update `menu_items` table
3. ✅ Remove ALL compiled views
4. ✅ Clear ALL caches
5. ✅ **Restart backend container** (this is important!)
6. ✅ Clear caches again after restart

---

## Or Manual Commands:

```bash
cd backend

# Read credentials
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

# Update database
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "UPDATE \`data_types\` SET \`display_name_singular\` = 'Bon de livraison', \`display_name_plural\` = 'Bons de livraison' WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';"

# Remove compiled views
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"

# Clear caches
docker exec -it sobitas-backend php artisan optimize:clear

# RESTART BACKEND (IMPORTANT!)
docker restart sobitas-backend

# Wait 10 seconds
sleep 10

# Clear caches again
docker exec -it sobitas-backend php artisan optimize:clear
```

---

## After Restart:

1. **Wait 15-20 seconds** for backend to fully restart
2. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check page title** - should show "Bons de livraison"

---

## If Still Not Working:

Check if the database was actually updated:

```bash
cd backend
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT \`id\`, \`name\`, \`slug\`, \`display_name_singular\`, \`display_name_plural\` FROM \`data_types\` WHERE \`slug\` = 'commandes';"
```

If it shows the old values, the SQL didn't run. Try connecting manually to MySQL.
