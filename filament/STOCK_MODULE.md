# Module Gestion de stock (Filament)

## Architecture

- **Migrations** : `stock_movements` (audit trail), `products.low_stock_threshold` (nullable, default 10).
- **Models** : `StockMovement` (product_id, type, qty_before/change/after, reason, reference, user_id, note), `Product` (relations `stockMovements`, accessors `stock_status`, `is_available`, `stock_threshold`).
- **Service** : `App\Services\StockService` — `recordMovement()`, `adjustStock()`, `getDashboardMetrics()`, `getSalesVelocity()`.
- **Filament** : groupe de navigation « Gestion de stock », pages sous `/stock`, `/stock/products`, etc.

## Routes (Filament)

| Slug | Page | Description |
|------|------|-------------|
| `stock` | StockDashboard | KPIs + graphique mouvements |
| `stock/products` | StockProductsPage | Table produits & niveaux de stock |
| `stock/movements` | StockMovementsPage | Mouvements de stock (journal) |
| `stock/alerts` | StockAlertsPage | Alertes / ruptures / stock faible |
| `stock/adjustments` | StockAdjustmentsPage | Ajustement manuel (quantité + raison) |
| `stock/reports` | StockReportsPage | Rapports (valeur par catégorie, résumé alertes) |

## Logique stock (storefront)

- **is_available** : `false` si `rupture = true` OU `qte <= 0` ; sinon `true`.
- **stock_status** : `in_stock` | `low_stock` | `out_of_stock` | `inconsistent` (désaccord qte / rupture).
- En front : si `rupture` ou `qte <= 0` → produit non achetable ; badge « Rupture de stock » si rupture.

## Fichiers créés / modifiés

- **Migrations** : `database/migrations/2026_02_25_100000_create_stock_movements_table.php`, `2026_02_25_100001_add_stock_fields_to_products_table.php`
- **Models** : `app/Models/StockMovement.php`, `app/Models/Product.php` (relations + accessors)
- **Service** : `app/Services/StockService.php`
- **Widgets** : `app/Filament/Widgets/StockKpisWidget.php`, `StockMovementChartWidget.php`
- **Pages** : `app/Filament/Pages/Stock/StockDashboard.php`, `StockProductsPage.php`, `StockMovementsPage.php`, `StockAlertsPage.php`, `StockAdjustmentsPage.php`, `StockReportsPage.php`
- **Vues** : `resources/views/filament/pages/stock/*.blade.php`
- **Provider** : `app/Providers/Filament/AdminPanelProvider.php` (groupe + pages)

## QA / Tests à valider

1. **Rupture manuelle** : Produit `qte = 50`, `rupture = true` → affiché en rupture en admin et considéré indisponible côté storefront.
2. **Incohérence** : `qte = 0`, `rupture = true` → statut incohérence ; `qte > 0`, `rupture = false` → rupture manuelle.
3. **Ajustement** : un ajustement crée un enregistrement dans `stock_movements` avec qty_before / qty_change / qty_after et met à jour `products.qte`.
4. **Dashboard** : les KPIs (total, en stock, rupture, stock faible, valeur, incohérences) se mettent à jour après actions.
5. **Filtres / tri** : table produits (catégorie, marque, état stock) et mouvements (type, produit) fonctionnent sans régression.
6. **Produits existants** : CRUD produit (ProductResource) inchangé ; champ `low_stock_threshold` optionnel (défaut 10).

## Déploiement

```bash
cd filament
php artisan migrate
# Vider cache si besoin
php artisan config:clear && php artisan view:clear
```

## Phase 2 (optionnel)

- Entrées / sorties dédiées (réception, casse).
- Inventaire / comptage (session de comptage → ajustements automatiques).
- Permissions (stock.view, stock.edit, stock.adjust).
- Export CSV/Excel des produits et mouvements.
- Notifications (email / in-app) pour ruptures et stock faible.
