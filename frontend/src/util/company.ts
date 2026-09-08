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
 * The shop's phone numbers, in every shape the codebase needs them.
 *
 * ── WHY THIS EXISTS EVEN THOUGH /coordonnees IS THE SYSTEM OF RECORD ───────────────────────
 * `phone_1` / `phone_2` are read from the API at every render, and that has not changed. But
 * every surface that reads them also carries a FALLBACK literal for the render where the fetch
 * returns nothing — and those fallbacks had multiplied into a dozen hand-typed copies across
 * the header, the footer, /contact, /qui-sommes-nous, /mentions-legales, the PDP, the request
 * dialog and the JSON-LD, in five different formats (spaced, unspaced, national, E.164, and the
 * bare msisdn wa.me wants). When the owner changed the mobile number on 08/09/2026 all of them
 * had to be found by hand, which is the definition of a value that needs one home.
 *
 * The API still wins wherever it answers. This is what the site says when it does not, and the
 * one place in the frontend a future number change has to be made.
 *
 * ── THE FORMATS ARE NOT INTERCHANGEABLE ────────────────────────────────────────────────────
 * `tel:` hrefs and schema.org's `telephone` want E.164 (`+216…`, no spaces). wa.me wants those
 * same digits with NO leading `+` — a `+` in the wa.me path yields a page that cannot resolve
 * the number at all. Visible copy wants the spaced form. Never derive one by string-replacing
 * another; pick the field.
 */
export const CONTACT_PHONE = {
  /** Visible copy, with the country code. */
  display: '+216 22 464 315',
  /** Visible copy inside a sentence that already says "appelez le …". */
  national: '22 464 315',
  /** E.164 — `tel:` hrefs and schema.org `telephone`. */
  e164: '+21622464315',
  /** Digits only, no `+` — wa.me and the SMS gateway. */
  msisdn: '21622464315',
} as const;

/** The shop's landline. Unchanged by the 08/09/2026 switch; here so the pair lives together. */
export const CONTACT_PHONE_FIXE = {
  display: '+216 73 200 169',
  e164: '+21673200169',
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
 * `ratingValue` and `reviewCount` are point-in-time snapshots, not values pretending to be live.
 * They were re-checked in the public Google Maps UI on 31/08/2026. Consumer-facing copy uses the
 * conservative `reviewCountLabel` ("1 290+") so a changing total does not make the site stale.
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
  reviewCount: 1271,
  reviewCountLabel: '1 270+',
  ratingCheckedOn: '2026-09-02',
  /** The short link on the profile; resolves to the place page with the same place id. */
  url: 'https://maps.app.goo.gl/w2ytnYAKSZDmjznh6',
  placeId: 'ChIJsZHosBsTAhMRDLJJWPLg2lE',
  /**
   * The direct "write a review" destination, not the profile.
   *
   * Owner, 07/09/2026: clicking through should land somewhere a customer can *post* a review.
   * `maps.app.goo.gl/...` opens the listing, where leaving one is three taps further in behind a
   * "Reviews" tab. `search.google.com/local/writereview` opens the compose dialog straight away
   * against this place id — it is Google's own documented entry point and the one every "leave us
   * a review" card printed on a shop counter uses.
   */
  writeReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJsZHosBsTAhMRDLJJWPLg2lE',
} as const;
