import type { Product } from '@/types';
import { getBrandCategoryNames } from '@/util/brandCategoryNames';
import { canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { DELIVERY } from '@/util/company';

export type BrandTemplateFacts = { inStockCount: number | null; priceMin: number | null; priceMax: number | null };
export type BrandFaq = { question: string; answer: string };

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function frenchList(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

export function brandHeading(name: string, families: string[]): string {
  const top = families.slice(0, 3);
  return top.length ? `${name} Tunisie : ${frenchList(top)}` : `${name} Tunisie`;
}

export function buildGenericBrandTemplate(name: string, products: Product[], facts: BrandTemplateFacts) {
  const families = getBrandCategoryNames(products).slice(0, 3);
  const links = families.map((family) => {
    const category = products.flatMap((product) => [product.sous_categorie, ...(product.sous_categories ?? [])])
      .find((item) => item?.designation_fr?.trim().toLowerCase() === family.toLowerCase() && item.slug);
    return category ? `<a href="${escapeHtml(canonicalCategoryPath(category.slug.toLowerCase()))}">${escapeHtml(family)}</a>` : escapeHtml(family);
  });
  const count = products.filter((product) => product?.designation_fr).length;
  const countLabel = `${count} produit${count > 1 ? 's' : ''}`;
  const stock = facts.inStockCount && facts.inStockCount > 0 ? `${facts.inStockCount} en stock` : null;
  const range = facts.priceMin && facts.priceMax && facts.priceMax > facts.priceMin
    ? `de ${facts.priceMin} à ${facts.priceMax} DT` : null;
  const first = count
    ? `${countLabel} ${escapeHtml(name)} au catalogue${links.length ? ` dans ${links.length === 1 ? 'la famille' : 'les familles'} ${frenchList(links)}` : ''}.`
    : `Aucun produit ${escapeHtml(name)} n'est actuellement publié dans le catalogue.`;
  const second = count
    ? `Comparez les produits ${escapeHtml(name)} par famille, format et taille${stock ? ` ; ${stock}` : ''}${range ? `, avec des prix ${range}` : ''}.`
    : `Aucune famille, aucun format ni aucune taille de cette marque ne peut être comparé pour le moment.`;
  const faqs: BrandFaq[] = [
    {
      question: `Quels produits ${name} sont disponibles ?`,
      answer: count
        ? `${countLabel} ${name} ${count === 1 ? 'figure' : 'figurent'} au catalogue${families.length ? `, notamment dans ${families.length === 1 ? 'la famille' : 'les familles'} ${frenchList(families)}` : ''}.${stock ? ` ${facts.inStockCount} ${facts.inStockCount === 1 ? 'est' : 'sont'} en stock.` : ''}`
        : `Aucun produit ${name} n'est actuellement publié dans le catalogue.`,
    },
    {
      question: `Comment choisir entre les produits ${name} ?`,
      answer: count
        ? `Comparez les familles${families.length ? ` (${frenchList(families)})` : ''}, puis le format et la taille indiqués sur chaque fiche produit.`
        : `Aucune famille ${name} n'est actuellement proposée ; il n'y a pas encore de formats à comparer.`,
    },
    {
      question: `Comment commander et recevoir un produit ${name} ?`,
      answer: `Ajoutez le produit au panier et passez commande. Livraison ${DELIVERY.windowLabel} en Tunisie, ${DELIVERY.feeDt} DT, offerte dès ${DELIVERY.freeFromDt} DT${DELIVERY.cashOnDelivery ? ', avec paiement à la livraison' : ''}.`,
    },
  ];
  return {
    heading: brandHeading(name, families),
    introHtml: `<p>${first}</p><p>${second}</p>`,
    howToChooseTitle: `Bien choisir un produit ${name}`,
    howToChooseBody: count
      ? 'Comparez les familles, les formats et les tailles indiqués sur chaque fiche produit.'
      : `Aucun produit ${name} n'est actuellement proposé ; il n'y a pas encore de famille, de format ou de taille à comparer.`,
    faqs,
  };
}
