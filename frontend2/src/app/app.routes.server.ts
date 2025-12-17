import { RenderMode, ServerRoute } from '@angular/ssr';
import { 
  categorySlugs, 
  subCategorySlugs,
  productTags, 
  commandeIDs, 
  brandIDs, 
  productSlugs,
  blogSlugs, 
  pageSlugs, 
  packSlugs 
} from './public/routes-ids';

export const serverRoutes: ServerRoute[] = [
  // Categories
  {
    path: 'categorie/:slug_cat',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return categorySlugs.map(slug_cat => ({ slug_cat }));
    },
  },
  {
    path: 'category/:slug_sub',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return subCategorySlugs.map(slug_sub => ({ slug_sub }));
    },
  },

  // Products
  {
    path: 'produits-search/:tag',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return productTags.map(tag => ({ tag }));
    },
  },
  {
    path: 'produits/:slug_sub/:tag',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return subCategorySlugs.flatMap(slug_sub => 
        productTags.map(tag => ({ slug_sub, tag }))
      );
    },
  },
  {
    path: 'shop/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return productSlugs.map(slug => ({ slug }));
    },
  },

  // Orders
  {
    path: 'commande/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return commandeIDs.map(id => ({ id }));
    },
  },

  // Brands
  {
    path: 'brand/:nom/:id_brand',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return brandIDs.map(b => ({ nom: b.nom, id_brand: b.id_brand }));
    },
  },

  // Blogs & Pages
  {
    path: 'blogs/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return blogSlugs.map(slug => ({ slug }));
    },
  },
  {
    path: 'page/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return pageSlugs.map(slug => ({ slug }));
    },
  },

  // Packs
  {
    path: 'pack/:packs',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return packSlugs.map(packs => ({ packs }));
    },
  },
  {
    path: 'compte/commande/:id',  // <=== match your publicRoutes path
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return commandeIDs.map(id => ({ id }));
    },
  },


  // Static routes
  { path: 'shop', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'marques', renderMode: RenderMode.Prerender },
  { path: 'cart', renderMode: RenderMode.Prerender },
  { path: 'checkout', renderMode: RenderMode.Prerender },
  { path: 'checkout-valid', renderMode: RenderMode.Prerender },
  { path: 'blogs', renderMode: RenderMode.Prerender },
  { path: 'remboursement', renderMode: RenderMode.Prerender },
  { path: 'condition-ventes', renderMode: RenderMode.Prerender },
  { path: 'proteine-tunisie-العربية', renderMode: RenderMode.Prerender },
  { path: 'category/creatine/19', renderMode: RenderMode.Prerender },

  // Catch-all
  { path: '**', renderMode: RenderMode.Prerender },
];
