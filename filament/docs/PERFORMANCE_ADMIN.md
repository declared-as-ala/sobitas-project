# Performance Admin Filament — Checklist & Mesures

## 1) Diagnostic (à faire en local avec Telescope/Debugbar)

### A) Navigateur (DevTools)
- **Network** : mesurer Document TTFB, chargement JS/CSS, XHR `livewire/update` (nombre + temps).
- **Console** : corriger toute erreur Livewire/Alpine (Component not found, 500, 419) — elles ralentissent fortement.

### B) Serveur
- `storage/logs/laravel.log` : vérifier erreurs.
- Telescope/Debugbar : nombre de requêtes SQL par page, requêtes lentes, N+1, temps Blade/Livewire.

### C) DB
- Requêtes lentes : activer le log MySQL ou utiliser `EXPLAIN` sur les requêtes lourdes.
- Pages les plus sensibles : listes Factures TVA, Produits, Devis, Bons de livraison, Tickets.

---

## 2) Checklist production (OBLIGATOIRE)

```bash
# En production
APP_DEBUG=false
APP_ENV=production

# Caches Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache   # si utilisé

# Composer (sans dev, autoload optimisé)
composer install --no-dev --optimize-autoloader

# OPcache PHP : vérifier qu'il est activé (phpinfo)
# Queues : emails/PDF en queue (QUEUE_CONNECTION=database ou redis), pas sync
```

- **Assets** : `php artisan filament:assets` si besoin ; s'assurer que les assets ne sont pas recompilés à chaque requête.

---

## 3) Optimisations appliquées (code)

### Tables (listes)
- **FactureTvaResource** : `with('client:id,name')` + `select()` sur les colonnes nécessaires pour réduire la taille des lignes ; pagination 25.
- **ProductResource** : `with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr'])` ; filtre Marque sans `preload()` (recherche uniquement).
- **FactureResource** : `with('client:id,name', 'factureTvas:id,facture_id')` pour éviter N+1 sur le bouton "Transformer en facture TVA".
- **QuotationResource** : déjà `with('client:id,name')`, pagination 25.

### Index DB
- Index existants (migration `2026_02_08_212044`) : `client_id`, `created_at` sur factures, facture_tvas, quotations, products, etc.
- **facture_tvas.numero** : index dédié (migration `2026_03_06_100000`).
- **Nouvelle migration** `2026_03_07_100000` : index sur `factures.numero` et `quotations.numero` pour recherche/tri dans les listes.

### Widgets dashboard
- **StatsOverview** : cache 120 s.
- **RevenueChart** : cache 120 s.
- **TopProductsWidget** : cache 300 s.
- **DashboardAlertsWidget** : cache 60 s.
- **MarketplaceKpis** : cache 60 s (clé basée sur la période).

---

## 4) Mesures avant/après (à remplir)

| Page / Métrique        | Avant (ex.) | Après (cible)     |
|------------------------|-------------|--------------------|
| Factures TVA list TTFB | … ms        | < 500 ms           |
| Produits list TTFB     | … ms        | < 500 ms           |
| Requêtes SQL (list)    | …           | < 30 par page      |
| Dashboard TTFB        | … ms        | < 500 ms           |

- **Objectif** : TTFB liste < 500 ms sur VPS, navigation menu → page rapide, pas d’erreur Livewire (Component not found / 500 / 419).

---

## 5) Commandes utiles

```bash
# Appliquer les index (migration)
php artisan migrate

# Vider les caches dashboard (pour tester sans attendre le TTL)
php artisan cache:clear
```

---

## 6) En cas de lenteur persistante

- Vérifier OPcache (opcache.enable=1, opcache.memory_consumption ~128).
- Mettre les jobs lourds (emails, PDF) en queue, pas en sync.
- Réduire le nombre de widgets sur le dashboard ou les rendre tous lazy + cachés.
- Vérifier qu’aucun middleware ou global scope ne lance des requêtes inutiles sur chaque page.
