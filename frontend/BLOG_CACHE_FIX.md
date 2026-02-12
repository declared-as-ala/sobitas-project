# Fix Cache Blog - Documentation

## Problème identifié

Les images et contenus du blog restaient en cache après modification depuis l'admin, causant :
1. Images obsolètes affichées même après refresh
2. Anciennes images lors de la pagination (page 2/3)
3. Contenu non mis à jour immédiatement

## Causes identifiées

1. **Cache navigateur/CDN** : Images servies sans cache busting
2. **Next.js App Router cache** : Données mises en cache par Next.js
3. **Router cache** : Navigation entre pages gardait les anciennes données
4. **Headers HTTP** : Pas de headers `no-cache` sur les pages blog

## Solutions implémentées

### 1. Cache busting pour les images ✅

**Fichier modifié** : `frontend/src/services/api.ts`

- Fonction `getStorageUrl()` modifiée pour accepter un paramètre `cacheBust`
- Ajout automatique de `?v=<timestamp>` basé sur `updated_at` ou `created_at`
- Utilisé dans tous les composants blog (liste, détail, articles liés)

**Exemple** :
```typescript
// Avant
getStorageUrl(article.cover)
// → https://admin.protein.tn/storage/articles/xxx.webp

// Après
getStorageUrl(article.cover, article.updated_at)
// → https://admin.protein.tn/storage/articles/xxx.webp?v=1739123456789
```

### 2. Fetch avec `cache: 'no-store'` ✅

**Fichier modifié** : `frontend/src/services/api.ts`

- `getAllArticles()`, `getArticleDetails()`, `getLatestArticles()` utilisent maintenant `fetch()` avec :
  - `cache: 'no-store'` (bypass Next.js cache)
  - `next: { revalidate: 0 }` (force revalidation)
  - Headers `Cache-Control: no-cache, no-store, must-revalidate`

**Avant** :
```typescript
const response = await api.get('/all_articles');
```

**Après** :
```typescript
const response = await fetch(`${API_URL}/all_articles`, {
  cache: 'no-store',
  next: { revalidate: 0 },
  headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
});
```

### 3. Headers HTTP no-cache via middleware ✅

**Fichier modifié** : `frontend/src/middleware.ts`

- Ajout de headers `Cache-Control: no-store` pour toutes les routes `/blog/*`
- Appliqué automatiquement à toutes les requêtes blog

### 4. Router refresh lors de la pagination ✅

**Fichier modifié** : `frontend/src/app/blog/BlogPageClient.tsx`

- Ajout de `router.refresh()` lors du changement de page
- Force le re-fetch des données serveur lors de la navigation

### 5. Route API de revalidation (bonus) ✅

**Fichier créé** : `frontend/src/app/api/revalidate/route.ts`

- Endpoint `/api/revalidate` pour invalider le cache manuellement
- Peut être appelé depuis l'admin après modification d'un article

**Usage** :
```bash
# Revalider toutes les pages blog
POST /api/revalidate?path=/blog

# Revalider une page spécifique
POST /api/revalidate?path=/blog/mon-article&secret=YOUR_SECRET

# Avec Authorization header
POST /api/revalidate?path=/blog
Headers: Authorization: Bearer YOUR_SECRET
```

**Configuration** (optionnelle) :
```env
REVALIDATE_SECRET=your-secret-key-here
```

## Fichiers modifiés

1. ✅ `frontend/src/services/api.ts`
   - `getStorageUrl()` : ajout cache busting
   - `getAllArticles()`, `getArticleDetails()`, `getLatestArticles()` : fetch avec no-cache

2. ✅ `frontend/src/types/index.ts`
   - Ajout de `updated_at?: string` au type `Article`

3. ✅ `frontend/src/app/blog/BlogPageClient.tsx`
   - Images avec cache busting
   - `router.refresh()` lors de la pagination
   - `unoptimized` sur les images (déjà configuré dans next.config.js)

4. ✅ `frontend/src/app/blog/[slug]/ArticleDetailClient.tsx`
   - Images avec cache busting (cover + articles liés)
   - `unoptimized` sur les images

5. ✅ `frontend/src/middleware.ts`
   - Headers no-cache pour routes `/blog/*`

6. ✅ `frontend/src/app/api/revalidate/route.ts` (nouveau)
   - Route API pour invalidation manuelle

## Vérification

### Test 1 : Modification d'une image
1. Modifier l'image d'un article depuis l'admin
2. Vérifier que l'URL contient `?v=<timestamp>` dans le code source
3. Refresh la page → nouvelle image doit apparaître

### Test 2 : Pagination
1. Aller sur `/blog?page=1`
2. Naviguer vers `/blog?page=3`
3. Vérifier que les images sont bien chargées (pas d'anciennes images)

### Test 3 : Headers HTTP
```bash
curl -I https://protein.tn/blog
# Doit contenir : Cache-Control: no-store, no-cache, must-revalidate
```

### Test 4 : Revalidation manuelle
```bash
curl -X POST "https://protein.tn/api/revalidate?path=/blog"
# Doit retourner : {"revalidated": true, "now": ...}
```

## Configuration backend (optionnel)

Pour utiliser la revalidation depuis l'admin, ajouter un webhook dans Laravel :

```php
// Dans le controller d'update d'article
public function update(Request $request, $id) {
    // ... update logic ...
    
    // Invalider le cache Next.js
    $revalidateUrl = config('app.frontend_url') . '/api/revalidate?path=/blog';
    Http::post($revalidateUrl, [
        'secret' => config('app.revalidate_secret')
    ]);
    
    return response()->json(['success' => true]);
}
```

## Notes importantes

1. **Performance** : Les pages blog ne sont plus mises en cache, ce qui peut légèrement impacter les performances. C'est un choix délibéré pour garantir la fraîcheur des données.

2. **Images** : Les images utilisent `unoptimized: true` (déjà configuré), donc pas d'optimisation Next.js. Le cache busting via `?v=` force le navigateur à recharger l'image.

3. **CDN/Cloudflare** : Si vous utilisez Cloudflare, assurez-vous que le mode SSL est configuré correctement (Flexible/Full) et que les règles de cache n'override pas les headers `no-cache`.

4. **Backend** : Le backend doit retourner `updated_at` dans les réponses API pour que le cache busting fonctionne. Si `updated_at` n'existe pas, `created_at` est utilisé comme fallback.

## Prochaines étapes (optionnel)

1. **ISR avec revalidation** : Si vous voulez garder un peu de cache pour les performances, vous pouvez utiliser ISR avec `revalidate: 60` (60 secondes) et appeler `/api/revalidate` après chaque update.

2. **Webhook automatique** : Configurer un webhook dans Laravel pour appeler `/api/revalidate` automatiquement après chaque modification d'article.

3. **Monitoring** : Ajouter des logs pour tracker les revalidations et identifier les problèmes de cache.
