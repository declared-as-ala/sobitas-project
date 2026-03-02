# Design System — Admin Facturation (protein.tn / SOBITAS)

**Objectif :** Interface ERP-lite professionnelle, claire, rapide. Libellés en français.

---

## 1. Typographie

| Usage | Classe / token | Taille | Graisse | Notes |
|-------|----------------|--------|---------|--------|
| Titre page (H1) | `text-2xl font-bold` | 24px | 700 | Titre de la ressource |
| Titre section (H2) | `text-lg font-semibold` | 18px | 600 | Cartes, sections |
| Labels | `text-sm font-medium` | 14px | 500 | Champs formulaire |
| Corps | `text-sm` | 14px | 400 | Texte courant |
| Helper | `text-xs text-gray-500` | 12px | 400 | Aide, sous-texte |
| Montants / chiffres | `tabular-nums font-medium` | — | 500 | Alignement droit, police à chasse fixe |

**Police :** Système (Inter / Segoe UI / Roboto) ou `font-sans` Filament. Pas de police &lt; 12px.

---

## 2. Échelle d’espacement

- **4** = 4px (gap serré)
- **8** = 8px
- **12** = 12px
- **16** = 16px
- **24** = 24px (sections)
- **32** = 32px (blocs)

Tailwind : `gap-2` (8), `gap-3` (12), `gap-4` (16), `gap-6` (24), `p-4` (16), `p-6` (24).

---

## 3. Couleurs & boutons

- **Primaire (marque) :** Orange `#f97316` (primary-500) — actions principales (Créer, Imprimer, Enregistrer).
- **Secondaire :** Gris bordure `gray-200`, fond `gray-50` — actions secondaires.
- **Destructif :** Rouge `red-600` — Supprimer, Annuler commande.
- **Ghost :** Transparent, hover léger — Retour, liens discrets.

Boutons : hauteur 40–44px, `rounded-lg`, focus ring visible (`ring-2 ring-primary-500 ring-offset-2`).

---

## 4. Contrôles de formulaire

- Hauteur champ : 44–48px (`min-h-[44px]` ou Filament default).
- Border radius : `rounded-lg` (8px).
- Focus : anneau visible, pas de outline: none sans équivalent.
- Labels associés (for/id ou aria-label).

---

## 5. Tableaux

- En-tête sticky en listes longues (Filament par défaut).
- Hover sur ligne : `hover:bg-gray-50`.
- Zebra optionnel : `tbody tr:nth-child(even):bg-gray-50/50`.
- Colonnes numériques : alignement droit, `tabular-nums`.
- Colonne actions : largeur fixe, icônes 20px.

---

## 6. Badges (statuts)

- **Brouillon** : `gray` (gris).
- **Envoyé** : `info` (bleu).
- **Émis / Validé** : `success` (vert).
- **Payé** : `success`.
- **Annulé / Refusé** : `danger` (rouge).
- **En attente** : `warning` (orange).

Style : `rounded-full` ou `rounded-lg`, `px-2.5 py-0.5`, `text-xs font-medium`.

---

## 7. États vides / erreur / chargement

- **Vide :** Illustration ou icône + message (« Aucun document ») + CTA si pertinent.
- **Erreur :** Toast ou bandeau avec message clair, pas uniquement technique.
- **Chargement :** Skeleton (lignes de tableau, cartes) plutôt que spinner seul.

---

## 8. Icônes

Heroicons (Filament) : cohérent dans toute l’admin. Pas de mélange Lucide/Heroicons sauf si migration explicite.

---

## 9. Responsive

- **Desktop :** 2 colonnes (client + totaux), tableaux complets.
- **Tablette / petit écran :** 1 colonne, tableaux scroll horizontal si besoin. Toujours 44px min pour les zones cliquables.

---

## 10. Impression (fiche A4)

- Marges : 12–15mm.
- Texte noir, contraste élevé.
- `@page { size: A4; margin: 12mm; }`
- En-tête de tableau répété sur chaque page (`thead { display: table-header-group; }`).
- Éviter `page-break-inside: avoid` sur trop de blocs (risque de pages vides).
- Zone imprimée uniquement = contenu du document (toolbar Imprimer / PDF en `no-print`).

---

## Vues d’impression (fiches A4)

Toutes les fiches utilisent le layout `print.layout` et les styles `print/partials/print-styles.blade.php`.

| Document | Route | Vue Blade |
|----------|--------|-----------|
| Bon de Livraison | `factures/{id}/print` | `print.bon-de-livraison` |
| Facture TVA | `facture-tvas/{id}/print` | `print.facture-tva` |
| Ticket | `tickets/{id}/print` | `print.ticket` |
| Devis | `quotations/{id}/print` | `print.devis` |
| Liste de Prix | `product-price-lists/{id}/print` | `print.liste-de-prix` |

En mode intégré (`?embed=1`), la barre d’outils (Imprimer / Fermer) est masquée pour le modal. Sur la page dédiée, utiliser Ctrl+P pour « Enregistrer en PDF ».

---

## Checklist écrans

- [ ] Liste (BL, Facture TVA, Ticket, Devis, Liste de prix)
- [ ] Création / édition (formulaire)
- [ ] Détail (en-tête document, totaux, actions)
- [ ] Vue print (prévisualisation + PDF)

## QA

- [ ] Desktop 1440px + 1024px
- [ ] Impression Chrome (PDF + imprimante)
- [ ] Clavier (tab, entrée, escape)
- [ ] Labels et erreurs accessibles
