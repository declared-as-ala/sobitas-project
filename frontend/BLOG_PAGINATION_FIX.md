# Fix Blog Pagination & Images - Documentation

## Problèmes résolus

### 1. ✅ Images manquantes lors de la pagination
- **Symptôme** : Blocs blancs au lieu d'images lors du changement de page
- **Cause** : Pas de placeholder/loading state, pas de fallback, pas de retry
- **Solution** : Composant `SafeImage` avec placeholder, retry automatique (2 tentatives), et fallback

### 2. ✅ Erreur React #418 (Hydration Mismatch)
- **Symptôme** : `Uncaught Error: Minified React error #418` en production
- **Cause** : Utilisation de `window` et `document` pendant le rendu SSR
- **Solution** : 
  - `decodeHtmlEntities` : suppression de `document.createElement` (utilise uniquement des remplacements de chaînes)
  - `useState` initial : lecture de `window.location.search` déplacée dans `useEffect`
  - `handleShare` : vérification de `mounted` avant utilisation de `window`

### 3. ✅ Pagination instable
- **Symptôme** : Clignotements, anciennes images affichées
- **Cause** : Keys instables, pas de loading state, `router.refresh()` sans feedback
- **Solution** :
  - Keys stables : `blog-${currentPage}-${article.id}` au lieu de `article.id`
  - Skeleton cards pendant la navigation
  - Overlay de chargement avec message "Chargement de la page X..."
  - État `isNavigating` pour gérer le loading

## Fichiers créés

### 1. `frontend/src/app/components/SafeImage.tsx`
Composant réutilisable pour les images avec :
- **Placeholder** : Skeleton animé pendant le chargement
- **Retry automatique** : 2 tentatives avec cache busting (`?retry=timestamp`)
- **Fallback** : Image par défaut SVG si toutes les tentatives échouent
- **Hydration-safe** : Ne rend rien jusqu'à ce que le composant soit monté côté client
- **Props** : Compatible avec `next/image` (fill, width, height, sizes, priority)

**Usage** :
```tsx
<SafeImage
  src={imageUrl}
  alt="Description"
  fill
  sizes="(max-width: 640px) 100vw, 50vw"
  priority={index < 3}
/>
```

### 2. `frontend/src/app/components/BlogCardSkeleton.tsx`
Skeleton card pour le loading state :
- Design identique aux vraies cartes
- Animation `animate-pulse`
- Responsive (mobile/tablet/desktop)
- Dark mode compatible

## Fichiers modifiés

### 1. `frontend/src/app/blog/BlogPageClient.tsx`

**Changements** :
- ✅ Remplacement de `Image` par `SafeImage`
- ✅ Ajout de `BlogCardSkeleton` pendant la navigation
- ✅ Keys stables : `blog-${currentPage}-${article.id}`
- ✅ État `isNavigating` avec overlay de chargement
- ✅ `decodeHtmlEntities` : suppression de `document.createElement`
- ✅ `useState` initial : lecture de `window.location.search` dans `useEffect`
- ✅ `mounted` state pour éviter l'hydratation mismatch

**Améliorations UX** :
- Overlay de chargement avec message "Chargement de la page X..."
- Skeleton cards pendant la navigation (pas de blocs blancs)
- Priority images pour les 3 premières images visibles

### 2. `frontend/src/app/blog/[slug]/ArticleDetailClient.tsx`

**Changements** :
- ✅ Remplacement de `Image` par `SafeImage` (cover + articles liés)
- ✅ `decodeHtmlEntities` : suppression de `document.createElement`
- ✅ `handleShare` : vérification de `mounted` avant utilisation de `window`
- ✅ Import de `useState` et `useEffect`

## Détails techniques

### SafeImage - Fonctionnalités

1. **Placeholder** :
   - Skeleton animé avec icône `ImageIcon`
   - Fond gris clair/sombre selon le thème
   - Animation `animate-pulse`

2. **Retry automatique** :
   - 2 tentatives maximum
   - Délai de 1 seconde entre chaque tentative
   - Cache busting : `?retry=${Date.now()}`

3. **Fallback** :
   - Image SVG par défaut si toutes les tentatives échouent
   - Ou `fallbackSrc` si fourni
   - Message "Image non disponible" avec icône

4. **Hydration-safe** :
   - Ne rend rien jusqu'à ce que `mounted === true`
   - Évite les différences SSR/client

### Pagination - Améliorations

1. **Keys stables** :
   ```tsx
   // Avant (instable)
   key={article.id}
   
   // Après (stable)
   key={`blog-${currentPage}-${article.id}`}
   ```
   - Empêche React de réutiliser les anciens composants
   - Force le re-render complet lors du changement de page

2. **Loading state** :
   ```tsx
   {isNavigating ? (
     // Skeleton cards
     Array.from({ length: ARTICLES_PER_PAGE }).map((_, idx) => (
       <BlogCardSkeleton key={`skeleton-${currentPage}-${idx}`} />
     ))
   ) : (
     // Vraies cartes
     paginatedArticles.map(...)
   )}
   ```

3. **Overlay de chargement** :
   - Backdrop blur
   - Message clair "Chargement de la page X..."
   - Z-index élevé pour être au-dessus du contenu

### Hydration Fix

**Avant** (causait erreur #418) :
```tsx
function decodeHtmlEntities(text: string): string {
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea'); // ❌ Hydration mismatch
    textarea.innerHTML = text;
    return textarea.value;
  }
  // Fallback...
}
```

**Après** (safe) :
```tsx
function decodeHtmlEntities(text: string): string {
  // Utilise uniquement des remplacements de chaînes
  // Pas de window/document, donc pas de mismatch
  return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')...
}
```

## Tests à effectuer

### 1. Pagination
- [ ] Aller sur `/blog?page=1`
- [ ] Cliquer sur "Page suivante" → Vérifier que les skeletons s'affichent
- [ ] Vérifier que les images se chargent correctement
- [ ] Aller sur `/blog?page=3` → Vérifier qu'il n'y a pas de blocs blancs
- [ ] Vérifier que les images sont différentes de la page 1

### 2. Images manquantes
- [ ] Simuler une image qui échoue (URL invalide)
- [ ] Vérifier que le retry se déclenche (2 tentatives)
- [ ] Vérifier que le fallback s'affiche après les échecs

### 3. Hydration
- [ ] Build production : `npm run build`
- [ ] Démarrer : `npm start`
- [ ] Ouvrir la console → Vérifier qu'il n'y a pas d'erreur #418
- [ ] Vérifier que le rendu SSR correspond au rendu client

### 4. Performance
- [ ] Vérifier que les 3 premières images ont `priority={true}`
- [ ] Vérifier que les autres images ont `loading="lazy"`
- [ ] Vérifier que les skeletons ne causent pas de layout shift

## Notes importantes

1. **Cache busting** : Les images utilisent déjà `?v=${timestamp}` basé sur `updated_at` ou `created_at` (implémenté précédemment)

2. **Performance** : 
   - Les skeletons sont légers (pas d'images à charger)
   - Le retry ne se déclenche que si l'image échoue
   - Les images prioritaires sont chargées en premier

3. **SEO** : 
   - Les skeletons n'affectent pas le SEO (remplacés par le contenu réel)
   - Les images ont toujours un `alt` descriptif
   - Le contenu HTML est toujours présent (pas de lazy loading du contenu)

4. **Accessibilité** :
   - Les images ont des `alt` text
   - Les skeletons ont une structure sémantique
   - Les boutons de pagination ont des `aria-label`

## Prochaines améliorations (optionnel)

1. **Intersection Observer** : Pour charger les images uniquement quand elles sont visibles
2. **Blur placeholder** : Utiliser `blurDataURL` pour un effet de flou progressif
3. **Error tracking** : Logger les échecs d'images pour monitoring
4. **Preload** : Précharger les images de la page suivante en arrière-plan
