/**
 * ── THE WORD UNDER THE STARS ────────────────────────────────────────────────────────────────
 * A number needs decoding; "Excellent" does not. Indexed 0–5 so `RATING_WORDS[stars]` is the
 * whole lookup and an unrated control renders nothing.
 *
 * One module rather than a constant per form. A customer can rate a product from THREE places —
 * the row at the top of the reviews section, the composer that row opens, and `/avis/{token}`,
 * the page the post-delivery review-request email links to — and three copies of this array is
 * three chances for the same five stars to be described three different ways.
 *
 * No classNames here on purpose: this file is imported by `/avis`, which must not pull the
 * composer (and with it the auth context and the API client) into its bundle just to name a
 * rating.
 */
export const RATING_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'] as const;

/**
 * `4 étoiles — Très bien`, for the accessible name of a star control.
 *
 * The word is part of the label, not only of the visible feedback: a screen-reader user tabbing
 * the row hears what each star means before choosing, which is the same information a sighted
 * user gets from hovering.
 */
export function ratingLabel(value: number): string {
  return `${value} étoile${value > 1 ? 's' : ''} — ${RATING_WORDS[value] ?? ''}`;
}
