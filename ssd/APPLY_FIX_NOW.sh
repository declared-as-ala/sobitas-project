#!/bin/bash
# Quick fix to see modern dashboard

echo "🔧 Applying route fix for modern dashboard..."

cd /root/sobitas-project || { echo "❌ Directory not found!"; exit 1; }

echo "📥 Pulling latest code..."
git pull origin main

echo "🧹 Clearing Laravel caches..."
cd backend
php artisan route:clear
php artisan cache:clear
php artisan config:clear
php artisan view:clear

echo "🔄 Restarting backend container (if using Docker)..."
docker compose restart backend 2>/dev/null || docker compose restart backend-v2 2>/dev/null || echo "⚠️ Docker restart skipped (not using Docker or container not found)"

echo ""
echo "✅ DONE! Now refresh: https://admin.sobitas.tn/admin"
echo "💡 Use hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo ""
echo "🔍 Verify route:"
php artisan route:list | grep -E "admin.*dashboard|admin/$" | head -3
