/**
 * The registered identity of the business behind protein.tn.
 *
 * ── WHY THESE ARE HARDCODED AND NOT READ FROM /coordonnees ─────────────────────────────────
 * They ARE in /coordonnees (`registre_commerce`, `matricule`), and the API is where they came
 * from — verified 19/08/2026 against the live record. But the surfaces that need them are the
 * footer, which renders on every page, and the "Qui sommes-nous" identity card, which is a
 * trust claim: both must render identically in the server HTML on the first byte, and neither
 * may show a half-filled legal block if one fetch fails. A registration number also does not
 * change; the address and the phone numbers do, which is exactly why those two are still read
 * from the API at every render and these are not.
 *
 * If the company is ever re-registered, this file is the one place to change — and the values
 * must be re-checked against /coordonnees, which stays the system of record.
 *
 * Source: https://admin.protein.tn/api/coordonnees
 *   matricule            "1411068/Q/A/M/000"
 *   registre_commerce    "B91142842015"
 *   designation_fr       "Proteine Tunisie"
 *
 * The legal name itself comes from the CMS "Qui sommes-nous" body, which has said
 * "SOBITAS (STE BITOUTA D'ARTICLE DE SPORT)" since before the consumer rebrand.
 */
export const LEGAL_IDENTITY = {
  /** The trading name shoppers know. */
  brand: 'Protein.tn',
  /** The registered company. Also the site's single biggest search query — see qui-sommes-nous/page.tsx. */
  legalName: 'SOBITAS — STE BITOUTA D’ARTICLE DE SPORT',
  shortLegalName: 'SOBITAS',
  registreCommerce: 'B91142842015',
  matriculeFiscal: '1411068/Q/A/M/000',
  /** Trading since. Stated in the CMS body and in the LocalBusiness schema. */
  foundedYear: 2010,
  city: 'Sousse',
} as const;

/**
 * The shop's Google Business Profile.
 *
 * ── WHAT IS AND IS NOT SAFE TO DO WITH THIS ────────────────────────────────────────────────
 * The rating below is DISPLAYED, attributed to Google, and linked to the profile it came from.
 * It is NOT emitted as `aggregateRating` in the LocalBusiness schema and must never be: rating
 * markup a site awards itself, or copies from a third party, is the structured-data violation
 * whose penalty is a sitewide manual action. The visible, attributed, linked form is the
 * legitimate way to show it, and it is what every serious retailer does.
 *
 * `ratingValue` was read from the profile on 19/08/2026 and is a point-in-time snapshot, which
 * is why it is a constant with a date rather than something pretending to be live. No review
 * COUNT is published: Google renders it client-side and the endpoint that serves it plainly
 * answers a scripted request with a CAPTCHA, so there is no honest number to put here. A rating
 * without a count is worth less than one with it — that is a real cost, and it is the correct
 * trade against publishing a figure nobody verified.
 */
/**
 * When the shop is open, in ONE place.
 *
 * ── IT WAS WRITTEN OUT THREE TIMES AND ONE OF THE THREE WAS ALREADY DIFFERENT ───────────────
 * The contact page's channel card said "Lun. – sam., 10 h – 19 h 30"; the store panel further
 * down the same page said the same plus "Dimanche : 14 h – 19 h"; and
 * `buildLocalBusinessSchema` carried a third copy in `openingHoursSpecification` with a comment
 * telling the next reader to keep it in sync by hand. So the card was already a SUBSET of the
 * panel beside it — Sunday simply missing — which is what three hand-maintained copies always
 * decay into.
 *
 * /api/coordonnees cannot supply this: the Coordinate record has address, phones, email and logos
 * and no hours field at all. So a constant, here, beside the other facts about the business that
 * must render on the first byte.
 *
 * ── THE WEDNESDAY DISCREPANCY IS DELIBERATELY NOT RESOLVED HERE ─────────────────────────────
 * The Google Business Profile shows Wednesday 11:00 while the site publishes 10:00 everywhere
 * (read 19/08/2026, and only that one day was visible). Publishing a partial reading would put
 * the site, the schema and the profile into three different states instead of two. It needs the
 * full GBP hours confirmed — an owner task, not a code change — and until then these values are
 * what the site has always said.
 */
export const OPENING_HOURS = {
  /** Human-readable, for the page. */
  weekdays: 'Lundi – Samedi : 10 h – 19 h 30',
  sunday: 'Dimanche : 14 h – 19 h',
  /** The same thing compressed for a one-line hint on a card. */
  short: 'Lun. – sam. 10 h – 19 h 30 · dim. 14 h – 19 h',
  /** schema.org OpeningHoursSpecification, so the markup cannot drift from the visible copy. */
  spec: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '19:30',
    },
    { days: ['Sunday'], opens: '14:00', closes: '19:00' },
  ],
} as const;

export const GOOGLE_PROFILE = {
  /** The name on the profile, which differs from the site's own H1s. */
  name: 'PROTEIN.TN - PROTEINE TUNISIE',
  ratingValue: 4.9,
  ratingCheckedOn: '2026-08-19',
  /** The short link on the profile; resolves to the place page with the same place id. */
  url: 'https://maps.app.goo.gl/w2ytnYAKSZDmjznh6',
  placeId: 'ChIJsZHosBsTAhMRDLJJWPLg2lE',
} as const;
