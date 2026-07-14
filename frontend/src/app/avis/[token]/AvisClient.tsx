'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Star, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
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
}

export default function AvisClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderForReview | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getOrderForReview(token);
        if (!active) return;
        setOrder(data);
        const init: Record<number, RowState> = {};
        data.products.forEach((p) => {
          init[p.product_id] = { stars: 0, comment: '', submitting: false, done: p.reviewed };
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
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

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
      });
      update(p.product_id, { submitting: false, done: true });
      toast.success(
        res.published ? 'Merci ! Votre avis est publié.' : 'Merci ! Votre avis sera publié après validation.'
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
    <>
      <Header />
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
                    Vous avez donné votre avis sur tous vos produits. Merci beaucoup ! 🙏
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
      <Footer />
    </>
  );
}
