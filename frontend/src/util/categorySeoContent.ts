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
  /**
   * Mass / gainer — the deep guide belongs to the URL Google actually ranks.
   *
   * `/mass-gainers` holds 9 of the 11 keywords the pair ranks for (SemRush TN, 08/09/2026),
   * including `mass gainer` (1600/mo) at 14, and `/mass-gainer` 308s INTO it, so every external
   * link to the singular already pools there. It was nevertheless reading the SHALLOWER of the two
   * guides while `/prise-de-masse` — 0 traffic, 2 keywords — served the 1,551-word one. The alias
   * hands the deep file to the page that can win with it.
   *
   * `/prise-de-masse` keeps its own file (`prise-de-masse.json`, resolved by identity below) and
   * becomes the objective "how to gain weight" hub that routes into this page and its neighbours.
   *
   * There is deliberately NO `'mass-gainer'` entry: that URL 308-redirects to `/mass-gainers`
   * (redirects.js) so the loader is never called with it, and an identity alias would be a no-op
   * anyway. Listing it next to the live `'mass-gainers'` line only suggests two URLs read this
   * file when exactly one does.
   */
  'mass-gainers': 'mass-gainer',
  // Pre-workout
  'pre-workout': 'pre-workout',
  'pre-workout-tunisie': 'pre-workout',
  // Whey – all common URL variants map to the same content file
  'whey-proteine': 'whey-protein',
  'isolat-whey': 'whey-protein',
  'isolate-whey': 'whey-protein',
  'proteine-whey': 'whey-protein',
  'whey-tunisie': 'whey-protein',
  'proteines-whey': 'whey-protein',
  'whey-protein-tunisie': 'whey-protein',
  // Creatine – common URL variants
  'creatine-monohydrate': 'creatine',
  'creatine-tunisie': 'creatine',
  'creatine-musculation': 'creatine',
  // Proteins – general
  'proteine': 'proteines',
  'proteines-tunisie': 'proteines',
  /**
   * BCAA – URL variants only.
   *
   * `/acides-amines` and `/eaa` are NOT variants: they are live rayons of their own (redirects.js
   * deliberately removed the old `/acides-amines` → `/bcaa` 308 because "Not a duplicate of
   * /bcaa"), and aliasing them here made all three URLs render the same title, H1 and 1,900-word
   * intro — three self-canonical indexable pages competing for one intent. `/acides-amines` is the
   * amino-acid parent (EAA, BCAA, glutamine, arginine), `/eaa` sells essential aminos. Each now
   * has a file of its own — acides-amines.json (the parent hub, routing into EAA/BCAA/glutamine/
   * arginine/citrulline) and eaa.json (the nine essentials, and how they differ from BCAA).
   */
  'bcaa': 'bcaa',
  'bcaa-tunisie': 'bcaa',
  // Glutamine
  'glutamine': 'glutamine',
  'glutamine-tunisie': 'glutamine',
  /**
   * FAT LOSS — an alias is safe only when the URL it names cannot be served.
   *
   * CONTENT_SERP_OWNER (below) stopped four URLs rendering ONE title/H1/description. It could not
   * stop them rendering one BODY, because sharing the body is what an alias is for. Measured with a
   * Googlebot UA on 23/09/2026, three of the five slugs listed here answered 200 — /perte-de-poids,
   * /cla and /bruleurs-de-graisse — so three live, self-canonical, indexable URLs served the same
   * ~1,900-word intro, buying guide and FAQ. That is the same cannibalisation the SERP fix
   * addressed, one layer down, and inside a single family where Google has to pick one.
   *
   * The two that stay are the two that CANNOT collide, because the loader is never reached with
   * them — both 308 into the owner (redirects.js, re-verified live 23/09/2026):
   *     /bruleur-de-graisse  -> 308 -> /bruleurs-de-graisse
   *     /fat-burner          -> 308 -> /bruleurs-de-graisse
   * They are kept as documentation of where that legacy equity pools, and they are no-ops.
   *
   * REMOVED BECAUSE THEY WERE SERVING A DUPLICATE BODY — the two that actually cost a URL:
   *   · 'perte-de-poids' — 200. It is the RAYON above this shelf in catalogTaxonomy.ts, parent of
   *     bruleurs-de-graisse, l-carnitine and cla (confirmed against admin /api/categories, id 2,
   *     23/09/2026). A rayon that renders its own child's buying guide has no subject of its own.
   *   · 'cla'            — 200, and 1 click / 2 impressions @22.0 (28 d), so protected by traffic:
   *     it keeps its URL and stays reachable, and it is a distinct ingredient, not a fat-burner
   *     formula. Same reasoning as the 'l-carnitine' note kept below.
   *
   * REMOVED AS DEAD WEIGHT, which resolved no duplication at all:
   *   · 'minceur' — 404, re-verified 23/09/2026. The slug is not a route, so the loader was never
   *     reached with it and the alias pointed nowhere. Deleting it changed no rendered page. It is
   *     a no-op in exactly the sense the two entries KEPT above are no-ops, and it is listed apart
   *     from the two real fixes so this block cannot be read as "removing it fixed a duplicate".
   *
   * Consequence, recorded rather than hidden: dropping the two real aliases left /perte-de-poids
   * and /cla with no body at all, and both were given a file of their own the same day.
   * perte-de-poids.json is the rayon — it routes into bruleurs-de-graisse, l-carnitine and cla with
   * one reason each and does not re-state the fat-burner subject. cla.json is the ingredient,
   * written against a shelf whose 30 references were ALL out of stock on 23/09/2026
   * (admin /api/productsBySubCategoryId/cla: every row qte 0, rupture true), so it promises no
   * availability. Neither page shares a body with /bruleurs-de-graisse any more.
   */
  'bruleurs-de-graisse': 'bruleurs-de-graisse',
  'bruleur-de-graisse': 'bruleurs-de-graisse',
  'fat-burner': 'bruleurs-de-graisse',
  // No `'l-carnitine'` entry: the two sub-categories share ZERO products (85 vs 95 references,
  // empty intersection 08/09/2026), so the shared hub guide was factually wrong on /l-carnitine.
  // It has its own file (l-carnitine.json) with its own buying guide; the alias hid it.
  // Antioxydants & Articulations
  'antioxydant': 'antioxydants',
  'antioxydants': 'antioxydants',
  'articulation': 'articulations',
  'articulations': 'articulations',
  // Beauty & Hair
  'beaute-cheveux': 'beaute-cheveux',
  'beaute-et-cheveux': 'beaute-cheveux',
  'cheveux': 'beaute-cheveux',
};

/**
 * ── ONE FILE, ONE SERP IDENTITY ──────────────────────────────────────────────────────────────
 *
 * An alias lets several URLs SHARE a hub's body copy (intro, buying guide, FAQ, related links) —
 * that is the point of the map above and it stays. What must never be shared is the SERP identity:
 * the h1, the <title> and the meta description. Since the 21/09/2026 decision in
 * resolveCategorySeo.ts every slug with a content file renders that file's three SERP fields, so
 * the aliases silently fanned ONE title/H1/description across four fat-burner URLs and three amino
 * URLs — /perte-de-poids (a parent category) and /l-carnitine were both titled "Brûleur de
 * Graisse", /eaa was titled "BCAA". Google keeps one URL per duplicate set and drops the rest.
 *
 * So: only the file's owning slug gets h1/metaTitle/metaDescription; every other slug reading the
 * same file keeps the hub body and falls back to its own CMS title/H1/description, as it did
 * before 21/09. The owner is the slug with the file's name, EXCEPT where the live URL differs from
 * the filename — `/mass-gainers` and `/whey-proteine` are the ranking URLs and their files are
 * named after the singular/English variant that 308s into them.
 */
const CONTENT_SERP_OWNER: Record<string, string> = {
  'mass-gainer': 'mass-gainers',
  'whey-protein': 'whey-proteine',
};

function serpOwnerSlug(contentSlug: string): string {
  return CONTENT_SERP_OWNER[contentSlug] ?? contentSlug;
}

function getContentPath(contentSlug: string): string {
  const safeSlug = contentSlug.replace(/[^a-z0-9-]/gi, '');
  return path.join(process.cwd(), CONTENT_DIR, `${safeSlug}.json`);
}

/**
 * Resolve canonical slug to content file slug (with alias support).
 */
function resolveContentSlug(slug: string): string {
  // Lowercased: the route lowercases every slug before it gets here, and the VPS filesystem is
  // case-sensitive — a mixed-case slug (the DB has `Intra-Workout`) would otherwise miss its file.
  const trimmed = slug.trim().toLowerCase();
  return CONTENT_SLUG_ALIASES[trimmed] ?? trimmed;
}

/**
 * Load SEO content for a category/subcategory by slug.
 * Tries slug first, then CONTENT_SLUG_ALIASES[slug]. Returns null if no file.
 */
export async function getCategorySeoContent(slug: string): Promise<Partial<CategorySeoContent> | null> {
  if (!slug?.trim()) return null;
  const contentSlug = resolveContentSlug(slug);
  // See CONTENT_SERP_OWNER: an aliased URL shares the hub's body, never its title/H1/description.
  const ownsSerpFields = serpOwnerSlug(contentSlug) === slug.trim().toLowerCase();
  try {
    const filePath = getContentPath(contentSlug);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Partial<CategorySeoContent>;
    if (!data || typeof data !== 'object') return null;
    return {
      h1: ownsSerpFields && typeof data.h1 === 'string' ? data.h1 : undefined,
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
      metaTitle:
        ownsSerpFields && typeof data.metaTitle === 'string' ? data.metaTitle.trim() || undefined : undefined,
      metaDescription:
        ownsSerpFields && typeof data.metaDescription === 'string'
          ? data.metaDescription.trim() || undefined
          : undefined,
      ogImage: typeof data.ogImage === 'string' ? data.ogImage.trim() || undefined : undefined,
    };
  } catch (error) {
    /**
     * A MISSING file is normal — most categories have no content file, and that is not an error.
     * A file that EXISTS but fails to parse is a different thing entirely, and swallowing both
     * identically is how twelve category guides went missing without anyone noticing.
     *
     * Those twelve files had one unescaped quote each (`class=\"…leading-relaxed">`, the closing
     * quote never escaped), so JSON.parse threw and this catch turned "your content is corrupt"
     * into "this category has no content". materiel-de-musculation, glucides, proteines-en-poudre
     * and every equipment category shipped with no intro, no buying guide and no FAQ, while a
     * perfectly good guide sat in the repo unreadable — for however long the files had been broken.
     *
     * ENOENT stays silent. Anything else is now loud.
     */
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') {
      console.error(
        `[categorySeoContent] "${slug}" has a content file that could NOT be read or parsed — ` +
          `the category will render with no editorial content: ${(error as Error)?.message ?? error}`
      );
    }
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
