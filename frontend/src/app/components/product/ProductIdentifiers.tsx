/**
 * The shop reference and the barcode, printed where a buyer looks for them.
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
 *
 * ── AND WHY THEY ARE NOW LEGIBLE ────────────────────────────────────────────────────────────
 * Owner, 17/08/2026: *"the barcode, make them visible"*.
 *
 * They shipped at `text-[11px]` in `text-ink-3` — the page's quietest size in its quietest ink,
 * which is the treatment reserved for things nobody needs. A 13-digit number read digit by digit,
 * against a pack held in the other hand, is the opposite of that. It is now 13px, the value sits
 * in `text-ink-1` on a `bg-sunken` chip so the digits have their own field, and the LABEL stays
 * small and quiet — the label is the part you can skip, not the number.
 *
 * `select-all` on the value: the realistic action here is copy-and-paste into a search box, and a
 * single click selecting the whole code saves a drag across 13 characters on a phone.
 */
import { Barcode, Hash } from 'lucide-react';

type Identifiable = {
  sku?: string | null;
  gtin?: string | null;
  schema?: { sku?: string | null; gtin?: string | null } | null;
};

export function ProductIdentifiers({ product, className = '' }: { product: Identifiable; className?: string }) {
  const sku = (product.sku || product.schema?.sku || '').toString().trim();
  const gtin = (product.gtin || product.schema?.gtin || '').toString().trim();

  if (!sku && !gtin) return null;

  const rows: Array<{ Icon: typeof Hash; label: string; value: string }> = [];
  if (sku) rows.push({ Icon: Hash, label: 'Référence', value: sku });
  if (gtin) rows.push({ Icon: Barcode, label: 'Code-barres (EAN)', value: gtin });

  return (
    /* `data-product-identifiers` is a test seam, and a deliberate one. The page guard used to
       find this block by matching "Réf." in the text of any <dl> in <main>, which broke the moment
       the label was reworded and again when the traceability panel introduced a second <dl> that
       legitimately prints a barcode. A marker costs one attribute and cannot be wrong. */
    <dl data-product-identifiers="" className={`flex flex-wrap gap-2 ${className}`}>
      {rows.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-sunken px-2.5 py-1.5"
        >
          <Icon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
          <dt className="text-[10px] font-semibold uppercase leading-none tracking-wide text-ink-3">{label}</dt>
          {/* `font-mono` + `tabular-nums`: a reference and a 13-digit barcode are read digit by
              digit, and a proportional face makes that measurably harder. */}
          <dd className="select-all font-mono text-[13px] font-semibold leading-none tabular-nums text-ink-1">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
