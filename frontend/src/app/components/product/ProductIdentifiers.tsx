/**
 * The shop reference and the barcode, printed where a buyer looks for them.
 *
 * ── WHY THIS IS A COMPONENT AND NOT TWO COPIES OF SIX LINES ─────────────────────────────────
 * `ProductDetailClient` carries TWO complete render trees — one `lg:hidden`, one `hidden lg:flex`
 * — and each has its own price block. Writing this inline meant writing it twice, which is exactly
 * the mechanism by which those trees drifted apart in the first place: every "small" addition made
 * inline is a future difference between what a phone shows and what a desktop shows. One component,
 * two call sites, no way for them to disagree.
 *
 * ── WHY SHOW THEM AT ALL ────────────────────────────────────────────────────────────────────
 * Owner, 16/08/2026, against a reference storefront that prints both directly under the price:
 * *"the sku or barcode"*. This page printed neither.
 *
 * They are not decoration on a supplement listing. The barcode is how a customer confirms they are
 * buying the same product they saw somewhere else, and on an imported catalogue where the shop does
 * not physically hold the stock, that check is the difference between confidence and a bounce.
 * 5,044 products carry a GTIN and every one of them was hiding it.
 *
 * Both values ALREADY go to Google inside the Product JSON-LD (`sku`, `gtin`). Showing the same
 * numbers to the person reading the page is what makes that markup honest rather than a claim only
 * a crawler can verify.
 */
type Identifiable = {
  sku?: string | null;
  gtin?: string | null;
  schema?: { sku?: string | null; gtin?: string | null } | null;
};

export function ProductIdentifiers({ product, className = '' }: { product: Identifiable; className?: string }) {
  const sku = (product.sku || product.schema?.sku || '').toString().trim();
  const gtin = (product.gtin || product.schema?.gtin || '').toString().trim();

  if (!sku && !gtin) return null;

  return (
    <dl className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3 ${className}`}>
      {sku && (
        <div className="flex items-center gap-1.5">
          <dt className="font-semibold uppercase tracking-wide">Réf.</dt>
          {/* `font-mono` + `tabular-nums`: a reference and a 13-digit barcode are read digit by
              digit, and a proportional face makes that measurably harder. */}
          <dd className="font-mono tabular-nums text-ink-2">{sku}</dd>
        </div>
      )}
      {gtin && (
        <div className="flex items-center gap-1.5">
          <dt className="font-semibold uppercase tracking-wide">Code-barres</dt>
          <dd className="font-mono tabular-nums text-ink-2">{gtin}</dd>
        </div>
      )}
    </dl>
  );
}
