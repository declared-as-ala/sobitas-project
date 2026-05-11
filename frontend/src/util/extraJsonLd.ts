/**
 * Client-side guard for supplementary JSON-LD from API (must mirror backend ExtraJsonLdValidator rules).
 */
export function sanitizeExtraJsonLd(items: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(items)) return [];
  const out: Array<Record<string, unknown>> = [];
  let i = 0;
  for (const item of items) {
    if (i >= 8) break;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const ctx = o['@context'];
    const type = o['@type'];
    if (typeof ctx !== 'string' || typeof type !== 'string') continue;
    if (!ctx.toLowerCase().includes('schema.org')) continue;
    out.push(o);
    i++;
  }
  return out;
}
