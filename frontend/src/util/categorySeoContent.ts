/**
 * Server-only: read category SEO content from content/categories/{slug}.json.
 * Used by category page and by API route (GET). Do not import in client components.
 */

import path from 'path';
import fs from 'fs/promises';
import type { CategorySeoContent } from '@/types/categorySeo';

const CONTENT_DIR = 'content/categories';

/**
 * API/canonical slug → content file name (without .json).
 * Ensures one JSON can serve multiple URL slugs (e.g. proteines + whey).
 */
export const CONTENT_SLUG_ALIASES: Record<string, string> = {
  'prise-de-masse': 'mass-gainer',
  'mass-gainer': 'mass-gainer',
  'pre-workout': 'pre-workout',
  'pre-workout-tunisie': 'pre-workout',
  'isolat-whey': 'whey-protein',
  'isolate-whey': 'whey-protein',
};

function getContentPath(contentSlug: string): string {
  const safeSlug = contentSlug.replace(/[^a-z0-9-]/gi, '');
  return path.join(process.cwd(), CONTENT_DIR, `${safeSlug}.json`);
}

/**
 * Resolve canonical slug to content file slug (with alias support).
 */
function resolveContentSlug(slug: string): string {
  const trimmed = slug.trim();
  return CONTENT_SLUG_ALIASES[trimmed] ?? trimmed;
}

/**
 * Load SEO content for a category/subcategory by slug.
 * Tries slug first, then CONTENT_SLUG_ALIASES[slug]. Returns null if no file.
 */
export async function getCategorySeoContent(slug: string): Promise<Partial<CategorySeoContent> | null> {
  if (!slug?.trim()) return null;
  const contentSlug = resolveContentSlug(slug);
  try {
    const filePath = getContentPath(contentSlug);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Partial<CategorySeoContent>;
    if (!data || typeof data !== 'object') return null;
    return {
      h1: typeof data.h1 === 'string' ? data.h1 : undefined,
      intro: typeof data.intro === 'string' ? data.intro : undefined,
      howToChooseTitle: typeof data.howToChooseTitle === 'string' ? data.howToChooseTitle : undefined,
      howToChooseBody: typeof data.howToChooseBody === 'string' ? data.howToChooseBody : undefined,
      faqs: Array.isArray(data.faqs)
        ? data.faqs.filter((f) => f && typeof f.question === 'string' && typeof f.answer === 'string')
        : [],
      relatedCategorySlugs: Array.isArray(data.relatedCategorySlugs)
        ? data.relatedCategorySlugs.filter((s) => typeof s === 'string')
        : [],
      bestProductSlugs: Array.isArray(data.bestProductSlugs)
        ? data.bestProductSlugs.filter((s) => typeof s === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Write SEO content for a category/subcategory. Server-only (e.g. API route).
 * Creates directory if needed.
 */
export async function setCategorySeoContent(
  slug: string,
  content: Partial<CategorySeoContent>
): Promise<void> {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '');
  if (!safeSlug) throw new Error('Invalid slug');
  const dir = path.join(process.cwd(), CONTENT_DIR);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${safeSlug}.json`);
  const toWrite = {
    h1: content.h1 ?? '',
    intro: content.intro ?? '',
    howToChooseTitle: content.howToChooseTitle ?? 'Comment choisir ?',
    howToChooseBody: content.howToChooseBody ?? '',
    faqs: content.faqs ?? [],
    relatedCategorySlugs: content.relatedCategorySlugs ?? [],
    bestProductSlugs: content.bestProductSlugs ?? [],
  };
  await fs.writeFile(filePath, JSON.stringify(toWrite, null, 2), 'utf-8');
}

/** List all slugs that have a content file (for admin UI). */
export async function listCategorySeoSlugs(): Promise<string[]> {
  try {
    const dir = path.join(process.cwd(), CONTENT_DIR);
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith('.json') && !f.startsWith('.') && !f.includes('.example.'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}
