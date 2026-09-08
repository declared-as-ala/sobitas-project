'use client';

import { useEffect, useId, useState } from 'react';
import { Star, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import {
  getOrderForReview,
  submitReviewByToken,
  getStorageUrl,
  type OrderForReview,
  type ReviewProduct,
} from '@/services/api';
import { RATING_WORDS, ratingLabel } from '@/app/components/reviews/rating';

/**
 * ── THE PAGE THE REVIEW-REQUEST EMAIL ACTUALLY LINKS TO ──────────────────────────────────────
 * `SendDueReviewRequests` builds `/avis/{order_token}` and `review-request.blade.php` puts that
 * URL behind the button. 33 of those went out on 08/09/2026, so this — not the product page
 * composer — is where the customers who were asked for a review arrive. It had never been through
 * a design pass.
 *
 * Measured before this rewrite, on a two-product order:
 *
 *   star target        32 x 32 px      the ≥44px rule, broken on the one control the whole page
 *                                      exists to collect. `p-0.5` around a 28px glyph.
 *   first star at      y ≈ 430 (390w)  186px of header prose, then a product row, then the stars
 *   page height        1977px (390w)   two products
 *   card height        283px           every field of every product open at once
 *   honeypot id        "hp_field" x2   ONE PER PRODUCT CARD, all with the same DOM id and the
 *                                      same `htmlFor` — invalid, and the label resolved to
 *                                      whichever card rendered first
 *   design tokens      none            61 baselined violations: bg-gray-50, red-600, emerald-*
 *
 * ── WHAT CHANGED, AND WHY IN THIS ORDER ─────────────────────────────────────────────────────
 * 1. THE STARS ARE 48px AND THEY ARE THE FIRST THING IN EACH CARD. Somebody arriving from a
 *    delivery email has already decided how they feel; the rating is the only field that is never
 *    optional and it was the smallest, lowest thing on the page.
 * 2. THE COMMENT AND THE SUBMIT APPEAR ONLY ONCE A RATING EXISTS, exactly as `ReviewComposer`
 *    does. A card is ~150px collapsed instead of 283px, so a four-product order is a page you
 *    scan rather than a form you survey, and the box that appears in RESPONSE to a tap is a much
 *    smaller ask than the same box presented cold.
 * 3. THE HEADER LOST ITS PARAGRAPH. "Cela aide d'autres sportifs — et ne prend que quelques
 *    secondes" is an argument for doing the thing the reader already clicked an email to do.
 *
 * ── WHAT DELIBERATELY DID NOT CHANGE ────────────────────────────────────────────────────────
 * The honeypot keeps its `hp_field` NAME, its `tabIndex={-1}`, its `autoComplete="off"`, its
 * `aria-hidden` and its clip on the input rather than on a wrapper. Only the duplicated `id` was
 * made unique, which is a correctness fix and not a loosening: `CapturesReviewSignals` reads the
 * field by NAME and never sees the id.
 *
 * `compose_ms` still starts at the row's first interaction rather than at page load — this page
 * is reached from an email and can sit open in a tab for an hour, and counting that as
 * composition time would make every review look laboriously hand-written, which is the opposite
 * of the signal `ReviewAuthenticity` is trying to read.
 *
 * ── WHAT THIS PAGE STILL CANNOT DO ──────────────────────────────────────────────────────────
 * NO PHOTO UPLOAD. `ReviewController::storeByToken` validates four keys and `images` is not one
 * of them, and it never calls `ReviewImageService`. `add_review` and `storeGuestReview` both
 * accept photos; this route does not. A picker here would collect files the API discards, so
 * there is none. It needs a backend change, not a frontend one.
 */

/** The API's own floor is `required` with no minimum, so this is the shortest thing worth storing. */
const MIN_COMMENT = 3;
const MAX_COMMENT = 1000;

interface RowState {
  stars: number;
  comment: string;
  submitting: boolean;
  done: boolean;
  /**
   * When this row was first touched, per product, in ms. See the note above on why it is not
   * stamped at page load. Per product, because one page can carry four reviews written minutes
   * apart.
   */
  openedAt: number | null;
}

export default function AvisClient({ token }: { token: string }) {
  const uid = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderForReview | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  /*
    ── WHY THIS FORM CARRIES THE SAME EVIDENCE AS THE PRODUCT PAGE ──────────────────────────────
    This is the form a real customer reaches from the delivery email, so it will carry most of the
    review volume — and every review written here has an attested purchase behind it, which is one
    of the two conditions for being paid 50 loyalty points. It is therefore both the highest-volume
    path and the most valuable one to farm.

    `honeypot`  a field no human can see. A script that fills every input it finds fills this one;
                the server then returns the ordinary success message and stores nothing, because
                telling a bot it was caught tells whoever wrote it which field to skip.
    `openedAt`  per row, above — submit time minus this is how long composing took, which the
                server weighs against the length of the text.

    Neither decides anything alone. See ReviewAuthenticity for how they are scored.
  */
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getOrderForReview(token);
        if (!active) return;
        setOrder(data);
        const init: Record<number, RowState> = {};
        data.products.forEach((p) => {
          init[p.product_id] = { stars: 0, comment: '', submitting: false, done: p.reviewed, openedAt: null };
        });
        setRows(init);
      } catch (e: unknown) {
        if (!active) return;
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Lien invalide ou expiré.';
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const update = (id: number, patch: Partial<RowState>) =>
    setRows((r) => ({
      ...r,
      // The first star press or the first keystroke starts this row's clock — one place, so a new
      // control added to the form later cannot forget to stamp it.
      [id]: { ...r[id], openedAt: r[id]?.openedAt ?? Date.now(), ...patch },
    }));

  /**
   * Rating a product is what reveals its comment box, so the box takes focus the moment it
   * exists — one tap to rate, then type, with no second tap to reach the field. Only on the
   * FIRST rating of a row: re-rating must not yank the caret out of half-written text.
   */
  const rate = (id: number, value: number) => {
    const first = (rows[id]?.stars ?? 0) === 0;
    update(id, { stars: value });
    if (first) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`${uid}-comment-${id}`);
        (el as HTMLTextAreaElement | null)?.focus({ preventScroll: true });
      });
    }
  };

  const submit = async (p: ReviewProduct) => {
    const row = rows[p.product_id];
    if (!row) return;
    if (row.stars < 1) {
      toast.error('Choisissez une note (1 à 5 étoiles).');
      return;
    }
    if (row.comment.trim().length < MIN_COMMENT) {
      toast.error('Écrivez un court commentaire.');
      return;
    }
    update(p.product_id, { submitting: true });
    try {
      const res = await submitReviewByToken({
        order_token: token,
        product_id: p.product_id,
        stars: row.stars,
        comment: row.comment.trim(),
        compose_ms: row.openedAt ? Math.max(0, Date.now() - row.openedAt) : 0,
        hp_field: honeypot,
      });
      update(p.product_id, { submitting: false, done: true });
      toast.success(
        res.published ? 'Merci ! Votre avis est publié.' : 'Merci ! Votre avis a bien été reçu.'
      );
    } catch (e: unknown) {
      update(p.product_id, { submitting: false });
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Une erreur est survenue. Réessayez.';
      toast.error(msg);
    }
  };

  const allDone =
    !!order && order.products.length > 0 && order.products.every((p) => rows[p.product_id]?.done);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-ink-3">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-hairline bg-elevated p-8 text-center">
            <p className="font-display text-xl font-bold uppercase tracking-tight text-ink-1">
              Lien invalide
            </p>
            <p className="mt-2 text-sm text-ink-2">{error}</p>
          </div>
        ) : order ? (
          <>
            {/* ── THE HEADER, HALVED ──────────────────────────────────────────────────────
                186px became ~100px. The kicker and the order number stay because they tell the
                reader this page belongs to them and to a specific delivery; the paragraph
                arguing that reviewing is quick and helps other athletes went, because the reader
                clicked an email asking for a review and does not need persuading a second time.
                "Achat vérifié" moved onto the same line as the order number: it is a fact about
                the order, not a banner. */}
            <header className="mb-6">
              <span className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                <span className="h-px w-5 bg-brand" aria-hidden="true" /> Votre avis
              </span>
              <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink-1 sm:text-3xl">
                {order.prenom ? `Merci ${order.prenom} !` : 'Merci !'}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                <span className="tabular-nums">Commande #{order.numero}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-elevated px-2 py-0.5 text-xs font-semibold text-ok">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Achat vérifié
                </span>
              </p>
            </header>

            {allDone && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-ok/40 bg-elevated p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-ok" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink-1">
                  Vous avez donné votre avis sur tous vos produits. Merci beaucoup !
                </p>
              </div>
            )}

            <div className="space-y-4">
              {order.products.map((p) => {
                const row = rows[p.product_id];
                const cover = p.cover ? getStorageUrl(p.cover) : null;
                const stars = row?.stars ?? 0;
                const tooShort = (row?.comment.trim().length ?? 0) < MIN_COMMENT;
                return (
                  <article
                    key={p.product_id}
                    className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={p.designation}
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-lg border border-hairline bg-canvas object-contain"
                        />
                      ) : null}
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink-1">
                        {p.designation}
                      </p>
                    </div>

                    {row?.done ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Avis
                        enregistré — merci !
                      </p>
                    ) : (
                      <>
                        {/* ── STEP ONE, AND UNTIL IT IS ANSWERED IT IS THE ONLY STEP ────── */}
                        <fieldset className="mt-3">
                          <legend className="sr-only">Note pour {p.designation}</legend>
                          <div className="flex items-center gap-0.5" role="radiogroup" aria-label={`Note pour ${p.designation}`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={stars === n}
                                aria-label={ratingLabel(n)}
                                onClick={() => rate(p.product_id, n)}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                {/* 36px, and `text-rule-strong` when unselected — the grey that
                                    is meant to be seen. It was a 28px glyph in `text-gray-300`,
                                    so the control this page exists for was both the smallest and
                                    the faintest thing on it. */}
                                <Star
                                  className={`h-9 w-9 transition-colors ${
                                    n <= stars ? 'fill-amber-400 text-amber-400' : 'text-rule-strong'
                                  }`}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                            {/* Inline from `sm` only, and the line below carries it on a phone —
                                see the same pair in `ReviewComposer` for the 320-against-292
                                measurement that made an inline word overflow the card at 390. */}
                            <span className="ms-2 hidden min-w-0 text-sm font-semibold text-ink-2 sm:inline">
                              {stars ? RATING_WORDS[stars] : ''}
                            </span>
                          </div>
                          {/* One line, always mounted, and it is the live region: an `aria-live`
                              element that appears already holding its new text announces nothing.
                              Hint before a rating, the rating's word after, so the block costs the
                              same height either way. */}
                          <p
                            aria-live="polite"
                            className={stars ? 'mt-1.5 text-sm font-semibold text-ink-2 sm:hidden' : 'mt-1.5 text-xs text-ink-3'}
                          >
                            {stars ? RATING_WORDS[stars] : 'Touchez une étoile pour commencer.'}
                          </p>
                        </fieldset>

                        {/* Moved off the visible page rather than `display:none` (some bots skip
                            hidden inputs), out of the tab order, hidden from assistive technology,
                            and told not to autofill — that last one is the failure mode this
                            technique actually has, since an autofilled honeypot silently discards a
                            real customer's review. Named `hp_field` for the same reason: `website`
                            and `company` are names browsers recognise. The id is per-product
                            because there is one of these per card and they used to share one. */}
                        <label
                          htmlFor={`${uid}-hp-${p.product_id}`}
                          className="absolute h-px w-px overflow-hidden [clip-path:inset(50%)]"
                        >
                          Ne pas remplir
                        </label>
                        <input
                          id={`${uid}-hp-${p.product_id}`}
                          name="hp_field"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          aria-hidden="true"
                          className="absolute h-px w-px overflow-hidden border-0 p-0 opacity-0 [clip-path:inset(50%)]"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />

                        {stars > 0 && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label htmlFor={`${uid}-comment-${p.product_id}`} className="sr-only">
                                Votre avis sur {p.designation}
                              </label>
                              <textarea
                                id={`${uid}-comment-${p.product_id}`}
                                value={row?.comment || ''}
                                onChange={(e) =>
                                  update(p.product_id, { comment: e.target.value.slice(0, MAX_COMMENT) })
                                }
                                rows={3}
                                placeholder="Goût, résultats, qualité…"
                                className="w-full resize-y rounded-xl border border-hairline bg-canvas px-3 py-3 text-base leading-snug text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              />
                              {/* The counter exists only while it means something: a maximum you
                                  are approaching. A permanent 0/1000 under every box is furniture. */}
                              {(row?.comment.length ?? 0) > MAX_COMMENT - 100 && (
                                <p className="mt-1 text-end text-xs tabular-nums text-ink-3">
                                  {row?.comment.length}/{MAX_COMMENT}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => void submit(p)}
                              disabled={row?.submitting}
                              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
                            >
                              {row?.submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : null}
                              Publier mon avis
                            </button>
                            {/* Only once there is something to be too short. An empty box does
                                not need telling that it is empty, and a hint that is on screen
                                before the customer has done anything wrong reads as a scolding
                                rather than as help — the same reason the composer's character
                                counter waits for a first keystroke. */}
                            {(row?.comment.length ?? 0) > 0 && tooShort && (
                              <p className="text-xs text-ink-3">Ajoutez quelques mots avant de publier.</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
