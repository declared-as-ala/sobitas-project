/**
 * "Contrôle & traçabilité" — the verifiable facts about this specific unit, in one block.
 *
 * ── WHAT THE OWNER ASKED FOR, AND WHAT THIS IS NOT ──────────────────────────────────────────
 * Owner, 17/08/2026, pointing at the reference storefront: *"for us add also the quality
 * controle!"*.
 *
 * The reference's block is a LABORATORY REPORT. It names an accredited lab (MULTILAB s.a), an
 * analysis date, a TUNAC accreditation number, per-assay verdicts (microbiology, mycotoxins,
 * salmonella, listeria) and a label-precision measurement — "measured 47.6 g against 52.5 g
 * declared, 95.1%" — and it links to the full report.
 *
 * We do not have any of that. Not for this product and not for any of the 10,669 in the catalogue.
 * Reproducing the SHAPE of that panel with invented or generic content would be the single most
 * damaging thing on this page: a fabricated certificate is a lie told to a customer about product
 * safety, it is a lie a competitor can disprove in one click, and under Google's structured-data
 * and misleading-content policies it is the kind of thing that costs a site its rankings rather
 * than a position or two. It is not a design shortcut, it is fraud with a border-radius.
 *
 * So this panel states only what the shop can actually stand behind, and every row of it is
 * checkable by the reader:
 *
 *   · the EAN-13, which they can type into any search engine and match against the pack
 *   · the manufacturer, linked to everything else we carry from them
 *   · the number of photographs of the actual printed label, linked to the photographs
 *   · that the nutrition panel on this page was transcribed FROM that label
 *   · the shop's own authenticity guarantee, stated as the shop's own and not as a third party's
 *
 * That is a traceability block, and it is honest. It is deliberately NOT called "analyses" or
 * "certifié", and it carries no lab marks, no accreditation logos and no assay verdicts.
 *
 * ── THE SLOT FOR REAL DATA ──────────────────────────────────────────────────────────────────
 * If the owner commissions actual analyses — MULTILAB and TUNAC are Tunisian and reachable — the
 * extension point is a `labReport` prop carrying { lab, accreditation, analysedOn, assays[],
 * reportUrl }, rendered as a second group under a separate "Analyses indépendantes" heading with
 * its own source line. Until such a record exists in the database, that group does not render,
 * because a panel that shows an empty analyses section teaches the reader to distrust the rest.
 */
import Link from 'next/link';
import { BadgeCheck, Barcode, Camera, ClipboardList, Factory } from 'lucide-react';

export function ProductQualityPanel({
  gtin,
  brandName,
  brandHref,
  labelPhotoCount,
  hasTranscribedNutrition,
  className = '',
}: {
  gtin?: string | null;
  brandName?: string | null;
  brandHref?: string | null;
  labelPhotoCount: number;
  hasTranscribedNutrition: boolean;
  className?: string;
}) {
  const rows: Array<{ Icon: typeof BadgeCheck; label: string; value: React.ReactNode }> = [];

  if (gtin) {
    rows.push({
      Icon: Barcode,
      label: 'Code-barres EAN-13',
      value: <span className="select-all font-mono tabular-nums">{gtin}</span>,
    });
  }

  if (brandName) {
    rows.push({
      Icon: Factory,
      label: 'Fabricant',
      value: brandHref ? (
        <Link href={brandHref} className="font-semibold underline-offset-2 hover:text-brand hover:underline">
          {brandName}
        </Link>
      ) : (
        <span className="font-semibold">{brandName}</span>
      ),
    });
  }

  if (labelPhotoCount > 0) {
    rows.push({
      Icon: Camera,
      label: 'Étiquette photographiée',
      value: (
        <a href="#pdp-label-photos" className="font-semibold underline-offset-2 hover:text-brand hover:underline">
          {labelPhotoCount} photo{labelPhotoCount > 1 ? 's' : ''} du produit
        </a>
      ),
    });
  }

  if (hasTranscribedNutrition) {
    rows.push({
      Icon: ClipboardList,
      label: 'Valeurs nutritionnelles',
      value: <span>Transcrites de l&apos;étiquette d&apos;origine</span>,
    });
  }

  /* Two facts is the floor. One row under a heading reads as a box that could not find anything
     to say, which is worse for trust than no box. */
  if (rows.length < 2) return null;

  return (
    <section
      /* Full bleed on a phone for the same reason as the accordion card beside it: at 390px a
         card inside a padded page starts its text 33px from the screen edge. The radius and the
         side borders return at `sm`. */
      className={`-mx-4 overflow-hidden border-y border-hairline bg-elevated sm:mx-0 sm:rounded-2xl sm:border ${className}`}
      aria-label="Contrôle et traçabilité"
    >
      <div className="flex items-center gap-2.5 border-b border-hairline bg-sunken px-4 py-3">
        <BadgeCheck className="h-5 w-5 shrink-0 text-ok" strokeWidth={2} aria-hidden="true" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">
          Contrôle &amp; traçabilité
        </h2>
      </div>

      <dl className="divide-y divide-hairline px-4">
        {rows.map(({ Icon, label, value }) => (
          /*
            `flex-wrap`, and the LABEL is the element allowed to shrink.

            The first version was `flex` with a `shrink-0` label and a `truncate` value, and it
            overflowed a 320px phone by 44px — measured by the page guard, which is the only reason
            it was caught, because at 390 and above it looks perfect. "Code-barres EAN-13" plus a
            13-digit number is simply wider than 320px minus the panel's padding, and no amount of
            truncation on the VALUE helps when the label refuses to give up space: a truncated
            barcode is a useless barcode.

            So the value drops to its own line on a narrow screen, still trailing-aligned, and the
            two stay on one line everywhere else.
          */
          <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
            <dt className="min-w-0 text-ink-3">{label}</dt>
            <dd className="ms-auto min-w-0 break-words text-end text-ink-1">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="border-t border-hairline px-4 py-3 text-xs leading-relaxed text-ink-3">
        Authenticité garantie par Protein.tn — produit scellé, référence et code-barres vérifiables
        sur l&apos;emballage. Les informations ci-dessus proviennent de l&apos;étiquette du fabricant ;
        en cas de différence, l&apos;étiquette imprimée fait foi.
      </p>
    </section>
  );
}
