'use client';

import { useCallback, useId, useState } from 'react';
import { MessageSquare, CornerDownRight, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getReviewReplies, addReviewReply } from '@/services/api';
import type { ReviewReply } from '@/types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { MemberLink } from './MemberLink';

/**
 * ── THE CONVERSATION UNDER ONE AVIS ─────────────────────────────────────────────────────────
 * Owner, 21/08/2026: *"users can put a review and other users can reply on them, and make a full
 * replies system."*
 *
 * ── COLLAPSED BY DEFAULT, AND THAT IS THE MAIN DESIGN DECISION ──────────────────────────────
 * A product page already carries a gallery, a buy box, seven disclosure panels and a related-
 * products rail. Expanding every thread inline would put an unbounded amount of stranger-written
 * text between a customer and the next review — on a phone, one popular review with eight replies
 * is a screen and a half of scrolling past a conversation you did not ask to read.
 *
 * So the collapsed state is one 44px row that states the count, and the replies are fetched only
 * when it is opened. That is also why `product_details` sends `replies_count` and NOT the replies:
 * the count is what the closed state needs, and shipping the bodies of every thread on the page
 * would inflate the ISR payload of a product nobody has expanded.
 *
 * ── EVERY REPLY IS HELD FOR A SECOND, SO THE UI SAYS SO ─────────────────────────────────────
 * `ReviewReplyObserver` moderates after the response is flushed; a clean reply is published a
 * second later. That leaves a real gap between "posted" and "visible", and there are only three
 * things a UI can do with it. Show nothing — the author assumes it failed and posts again. Claim it
 * is published — a lie, and the refetch then contradicts it. Or show the message with an honest
 * pending label, which is what `pending` on the appended reply does.
 *
 * ── FLAT, WITH ATTRIBUTION ──────────────────────────────────────────────────────────────────
 * `parent_id` is rendered as "En réponse à Nom", not as an indent level. Depth is capped at the
 * data layer for the same reason it is capped here: a nested thread inside a 390px column loses
 * ~24px of line length per level, and three levels in, the text is a ribbon.
 */

const NAME_MAX = 60;
const BODY_MAX = 1000;

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

export function ReviewThread({
  reviewId,
  replyCount,
  reviewerName,
}: {
  reviewId: number;
  /** From `product_details`. `undefined` means the backend predates the table — not "zero". */
  replyCount?: number;
  /** Named in the reply form's label so it is obvious who is being answered. */
  reviewerName: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const formId = useId();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [replies, setReplies] = useState<ReviewReply[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState('');
  const [guestName, setGuestName] = useState('');
  const [replyTo, setReplyTo] = useState<ReviewReply | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const known = replies.length || replyCount || 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getReviewReplies(reviewId);
      setReplies(list);
      setLoaded(true);
    } catch {
      // A thread that cannot load must not break the review above it. The row stays, the count
      // stays, and the customer can retry by collapsing and reopening.
      toast.error('Impossible de charger les réponses.');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) void load();
  }, [open, loaded, loading, load]);

  const openForm = useCallback(
    (target: ReviewReply | null) => {
      setReplyTo(target);
      setShowForm(true);
      if (!open) {
        setOpen(true);
        if (!loaded && !loading) void load();
      }
    },
    [open, loaded, loading, load]
  );

  const submit = useCallback(async () => {
    const text = body.trim();
    if (text.length < 2) {
      toast.error('Votre réponse est trop courte.');
      return;
    }
    if (!isAuthenticated && guestName.trim().length < 2) {
      toast.error('Indiquez un nom à afficher.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addReviewReply(reviewId, {
        body: text,
        parent_id: replyTo?.id ?? null,
        ...(isAuthenticated ? {} : { author_name: guestName.trim() }),
      });

      /* Appended locally with `pending`, never refetched into place. The server has the reply but
         has not published it yet, so a refetch here would return a list WITHOUT it and the author
         would watch their own message disappear. */
      setReplies((prev) => [
        ...prev,
        {
          ...res.reply,
          name: res.reply.name || (isAuthenticated ? user?.name || 'Vous' : guestName.trim()),
          pending: !res.published,
        },
      ]);
      setBody('');
      setReplyTo(null);
      setShowForm(false);
      toast.success(res.message || 'Merci pour votre réponse !');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(
        message || (status === 429 ? 'Trop de réponses envoyées. Réessayez plus tard.' : 'Envoi impossible pour le moment.')
      );
    } finally {
      setSubmitting(false);
    }
  }, [body, guestName, isAuthenticated, replyTo, reviewId, user?.name]);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {known > 0 && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="-my-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
            {open ? 'Masquer les réponses' : `${known} ${known === 1 ? 'réponse' : 'réponses'}`}
          </button>
        )}

        <button
          type="button"
          onClick={() => openForm(null)}
          className="-my-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CornerDownRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          Répondre
        </button>
      </div>

      {open && (
        /* `border-s` rather than an indent: one 1px rule ties the whole thread to the review above
           it and costs 13px of line length instead of 24px per message. On a 390px column that is
           the difference between readable replies and a ribbon of text. */
        <div className="mt-2 space-y-3 border-s border-rule ps-3 sm:ps-4">
          {loading && !loaded ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ) : (
            replies.map((reply) => {
              const parent = reply.parent_id ? replies.find((r) => r.id === reply.parent_id) : null;
              return (
                <div key={reply.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {reply.is_staff ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand">
                        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Protein.tn
                      </span>
                    ) : (
                      <MemberLink userId={reply.user_id} name={reply.name} className="text-[13px] font-bold text-ink-1" />
                    )}

                    {reply.is_staff && (
                      <span className="rounded-full border border-brand/40 bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                        Boutique
                      </span>
                    )}

                    {reply.pending && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        En vérification
                      </span>
                    )}

                    <span className="text-xs tabular-nums text-ink-3">{formatDate(reply.created_at)}</span>
                  </div>

                  {parent && (
                    <p className="mt-1 text-xs text-ink-3">
                      En réponse à <span className="font-medium text-ink-2">{parent.name}</span>
                    </p>
                  )}

                  <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-2">{reply.body}</p>

                  {!reply.pending && (
                    <button
                      type="button"
                      onClick={() => openForm(reply)}
                      className="-my-2 mt-0.5 inline-flex min-h-[44px] items-center gap-1.5 rounded py-2 text-xs font-semibold text-ink-3 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Répondre
                    </button>
                  )}
                </div>
              );
            })
          )}

          {loaded && replies.length === 0 && !showForm && (
            <p className="text-[13px] text-ink-3">Aucune réponse pour le moment.</p>
          )}

          {showForm && (
            <div className="rounded-xl border border-hairline bg-sunken p-3">
              <p className="mb-2 text-xs text-ink-3">
                {replyTo ? (
                  <>
                    Réponse à <span className="font-medium text-ink-2">{replyTo.name}</span>
                  </>
                ) : (
                  <>
                    Réponse à l’avis de <span className="font-medium text-ink-2">{reviewerName}</span>
                  </>
                )}
              </p>

              {!isAuthenticated && (
                <div className="mb-2">
                  <label htmlFor={`${formId}-name`} className="mb-1 block text-xs font-semibold text-ink-1">
                    Votre nom
                  </label>
                  <Input
                    id={`${formId}-name`}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value.slice(0, NAME_MAX))}
                    placeholder="Prénom ou pseudo"
                    className="h-11 rounded-lg border-hairline bg-canvas"
                  />
                </div>
              )}

              <label htmlFor={`${formId}-body`} className="mb-1 block text-xs font-semibold text-ink-1">
                Votre réponse
              </label>
              <Textarea
                id={`${formId}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={3}
                placeholder="Posez une question ou partagez votre expérience…"
                className="rounded-lg border-hairline bg-canvas"
              />
              <p className="mt-1 text-end text-[11px] tabular-nums text-ink-3">
                {body.length}/{BODY_MAX}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  onClick={submit}
                  disabled={submitting}
                  className="min-h-[44px] rounded-lg bg-brand font-display text-[13px] font-bold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Envoi…
                    </>
                  ) : (
                    'Publier ma réponse'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setReplyTo(null);
                  }}
                  className="min-h-[44px] rounded-lg border-hairline text-[13px]"
                >
                  Annuler
                </Button>
              </div>

              <p className="mt-2 text-[11px] leading-snug text-ink-3">
                Les réponses sont vérifiées automatiquement avant publication.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
