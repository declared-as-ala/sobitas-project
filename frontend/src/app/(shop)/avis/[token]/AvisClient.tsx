'use client';

import { useEffect, useState } from 'react';
import { Star, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import {
  getOrderForReview,
  submitReviewByToken,
  getStorageUrl,
  type OrderForReview,
  type ReviewProduct,
} from '@/services/api';

interface RowState {
  stars: number;
  comment: string;
  submitting: boolean;
  done: boolean;
  /**
   * When this row was first touched, per product, in ms.
   *
   * Stamped on the first interaction rather than on page load: this page is reached from an email
   * and can sit open in a tab for an hour before anybody types, and counting that as composition
   * time would make every review look laboriously hand-written — the opposite of the signal being
   * measured. Per product, because one page can carry four reviews written minutes apart.
   */
  openedAt: number | null;
}

export default function AvisClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderForReview | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  /*
    ── WHY THIS FORM CARRIES THE SAME EVIDENCE AS THE PRODUCT PAGE ──────────────────────────────
    This is the form a real customer reaches from the delivery email, so it will carry most of the
    review volume — and every review written here has an attested purchase behind it, which is one
    of the two conditions for being paid 50 loyalty points. It was therefore both the highest-volume
    path and the most valuable one to farm, and it was the only one sending no evidence at all.

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
      // The first star click or the first keystroke starts this row's clock — one place, so a new
      // control added to the form later cannot forget to stamp it.
      [id]: { ...r[id], openedAt: r[id]?.openedAt ?? Date.now(), ...patch },
    }));

  const submit = async (p: ReviewProduct) => {
    const row = rows[p.product_id];
    if (!row) return;
    if (row.stars < 1) {
      toast.error('Choisissez une note (1 à 5 étoiles).');
      return;
    }
    if (row.comment.trim().length < 3) {
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

  /*
    Moved off the visible page rather than `display:none` (some bots skip hidden inputs), removed
    from the tab order, hidden from assistive technology, and told not to autofill. That last one is
    the failure mode this technique actually has — an autofilled honeypot silently discards a real
    customer's review — which is also why the field is named `hp_field` and not `website`.

    The clip is on the INPUT, not on a wrapper. A wrapper hides the field visually while leaving the
    input's own box at full size, which measured 5160px² the first time this was written elsewhere.
  */
  const honeypotField = (
    <>
      <label htmlFor="hp_field" className="absolute h-px w-px overflow-hidden [clip-path:inset(50%)]">
        Ne pas remplir
      </label>
      <input
        id="hp_field"
        name="hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-px w-px overflow-hidden border-0 p-0 opacity-0 [clip-path:inset(50%)]"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
    </>
  );

  const allDone =
    !!order && order.products.length > 0 && order.products.every((p) => rows[p.product_id]?.done);

  return (
    <>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="font-display text-xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
                Lien invalide
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          ) : order ? (
            <>
              <header className="mb-8">
                <span className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                  <span className="h-px w-5 bg-red-600" aria-hidden="true" /> Votre avis
                </span>
                <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                  {order.prenom ? `Merci ${order.prenom} !` : 'Merci !'}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Partagez votre expérience sur les produits de votre commande{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">#{order.numero}</span>. Cela aide
                  d&apos;autres sportifs — et ne prend que quelques secondes.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Achat vérifié
                </p>
              </header>

              {allDone && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {/* No emoji in UI (DESIGN_SYSTEM §10) — the CheckCircle2 beside this
                        already carries the sentiment, and an emoji renders differently on every
                        platform. */}
                    Vous avez donné votre avis sur tous vos produits. Merci beaucoup !
                  </p>
                </div>
              )}

              <div className="space-y-5">
                {order.products.map((p) => {
                  const row = rows[p.product_id];
                  const cover = p.cover ? getStorageUrl(p.cover) : null;
                  return (
                    <div
                      key={p.product_id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start gap-4">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={p.designation}
                            width={64}
                            height={64}
                            className="h-16 w-16 shrink-0 rounded-lg border border-gray-100 object-contain dark:border-gray-800"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-gray-900 dark:text-white">{p.designation}</p>
                          {row?.done ? (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Avis enregistré — merci !
                            </p>
                          ) : (
                            <>
                              <div className="mt-3 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                                    onClick={() => update(p.product_id, { stars: n })}
                                    className="p-0.5"
                                  >
                                    <Star
                                      className={`h-7 w-7 transition-colors ${
                                        n <= (row?.stars || 0)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                              {honeypotField}
                              <textarea
                                value={row?.comment || ''}
                                onChange={(e) => update(p.product_id, { comment: e.target.value })}
                                rows={3}
                                maxLength={1000}
                                placeholder="Qu'avez-vous pensé de ce produit ? (goût, résultats, qualité…)"
                                className="mt-3 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => submit(p)}
                                disabled={row?.submitting}
                                className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-5 font-display text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                              >
                                {row?.submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Publier mon avis
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
