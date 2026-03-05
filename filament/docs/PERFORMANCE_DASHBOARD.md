# Performance Dashboard Filament — Diagnostic & Optimisations

## 1) Diagnostic (à faire en premier)

### A) Côté navigateur (DevTools)

1. **Network**
   - Ouvrir DevTools (F12) → onglet **Network**.
   - Naviguer entre 2–3 pages (ex: Dashboard → Factures TVA → une facture).
   - Noter :
     - **Document (HTML)** : temps TTFB (Time To First Byte) et durée totale.
     - **XHR** : requêtes Livewire (souvent `livewire/update`) — nombre et durée.
     - **JS/CSS** : rechargement ou cache (304 vs 200).
   - Si beaucoup de requêtes (20+) ou TTFB > 500 ms → problème serveur ou trop de composants.

2. **Console**
   - Vérifier erreurs JS (Livewire, Alpine) : "Component not found" ou erreurs réseau ralentissent tout.

### B) Côté serveur

1. **Logs**
   - `storage/logs/laravel.log` : erreurs PHP, slow query log si activé.

2. **Telescope / Debugbar (en local)**
   - Activer temporairement pour une requête type "Liste Factures TVA" :
     - Nombre de requêtes SQL (viser < 10–15 pour une liste paginée).
     - Requêtes lentes (> 100 ms).
     - Temps de rendu Blade/Livewire.

### C) Pages identifiées comme sensibles

| Page | Risque | Cause typique |
|------|--------|----------------|
| **Liste Factures TVA** | Moyen | Beaucoup de lignes, colonnes calculées (TVA %), recherche sur `numero` sans index. |
| **Edit/Create Facture TVA** | Élevé | Select Produit avec `->preload()` chargeait **tous** les produits (N très grand). |
| **Edit Devis / BL / Ticket** | Élevé | Même Select Produit avec preload. |
| **Dashboard** | Moyen | Nombreux widgets (stats, graphiques) qui requêtent en même temps. |
| **Liste Commandes** | Moyen | Relations client, détails. |

---

## 2) Causes fréquentes (et corrections appliquées)

- **Select Produit avec `->options(...)->preload()`**  
  → Chargement de tous les produits à chaque affichage du formulaire.  
  → **Corrigé** : remplacement par `getSearchResultsUsing()` + `getOptionLabelUsing()` avec **limit 30** et recherche sur `designation_fr` / `code_product`. Plus de preload.

- **Absence d’index sur colonnes recherchées/filtrées**  
  → Recherche sur `facture_tvas.numero` en full table scan.  
  → **Corrigé** : migration ajoutant l’index `idx_facture_tvas_numero`.

- **Widgets chargés en même temps que la page**  
  → DocumentTimelineWidget chargé de façon synchrone sur les pages Edit.  
  → **Corrigé** : widget passé en `$isLazy = true` pour ne pas bloquer le premier rendu.

- **N+1 sur les tables**  
  → Déjà limité par `modifyQueryUsing(fn ($q) => $q->with('client:id,name'))` sur FactureTvaResource (et autres). À vérifier sur les autres listes (Commandes, Tickets, etc.) si besoin.

- **Cache Laravel non utilisé en prod**  
  → Config / routes / vues rechargées à chaque requête.  
  → **À faire en déploiement** : voir checklist ci‑dessous.

---

## 3) Optimisations appliquées (fichiers modifiés)

| Fichier | Modification |
|---------|--------------|
| `app/Filament/Resources/FactureTvaResource.php` | Select Produit : suppression de `options()` + `preload()`, ajout de `getSearchResultsUsing()` (limit 30, recherche designation_fr/code_product) et `getOptionLabelUsing()`. |
| `database/migrations/2026_03_06_100000_add_index_facture_tvas_numero_for_search.php` | Nouvel index sur `facture_tvas.numero` pour la recherche Filament. |
| `app/Filament/Widgets/DocumentTimelineWidget.php` | `$isLazy = true` pour chargement différé du widget. |

---

## 4) Optimisations à faire en déploiement (checklist)

### Base Laravel (production)

```bash
# Caches (à exécuter après chaque déploiement)
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Désactiver le debug en prod
# Dans .env : APP_DEBUG=false
```

### PHP / serveur

- Vérifier **OPcache** activé (php.ini ou PHP-FPM).
- En prod : `composer install --no-dev --optimize-autoloader`.

### Base de données

- Exécuter les migrations : `php artisan migrate` (inclut l’index `facture_tvas.numero`).
- Les index `client_id`, `created_at` sur `facture_tvas` sont déjà en place (migration performance précédente).

### Filament / Livewire

- Pas de changement de config requis.
- Si d’autres listes sont lentes : vérifier `modifyQueryUsing` + `with()` pour les relations affichées, et pagination (ex. 25 par page).

---

## 5) Mesures avant / après (à remplir par vous)

| Métrique | Avant | Après (attendu) |
|----------|--------|------------------|
| TTFB page Liste Factures TVA | ___ ms | < 300 ms |
| Nombre de requêtes SQL (liste Factures TVA) | ___ | < 15 |
| Temps chargement formulaire Edit Facture TVA | ___ ms | nette baisse (plus de chargement de tous les produits) |
| Nombre de requêtes à l’ouverture Edit Facture TVA | ___ | réduction forte (1 requête Coordinate en cache + 0 produit jusqu’à la recherche) |

---

## 6) Checklist de test navigation

1. **Config / cache**
   - [ ] `php artisan config:cache` exécuté.
   - [ ] `APP_DEBUG=false` en prod.

2. **Navigation entre 5 pages**
   - [ ] Dashboard → chargement acceptable.
   - [ ] Factures TVA (liste) → chargement acceptable.
   - [ ] Ouvrir une Facture TVA (edit) → formulaire rapide.
   - [ ] Champ Produit : taper une recherche → résultats en < 1 s.
   - [ ] Devis (liste) puis Edit → pas de ralentissement évident.

3. **Réseau**
   - [ ] Peu de requêtes XHR Livewire par navigation (< 5 si possible).
   - [ ] Pas d’erreurs Console sur les pages testées.

Si une page reste lente après ces optimisations, utiliser Telescope/Debugbar sur cette URL pour cibler les requêtes SQL ou le rendu Livewire/Blade concerné.
