'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BadgeCheck, Camera, CheckCircle2, Clock3, Loader2, Star, Trash2, X } from 'lucide-react';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { addGuestReview, addReview, getReviewAccess } from '@/services/api';
import type { ReviewAccess, ReviewSubmitResult } from '@/types';
import { notify as toast } from '@/lib/notify';
import { ProtinaAmount } from '@/app/components/loyalty/Protina';

/**
 * ── WRITING A REVIEW, ON A PHONE ────────────────────────────────────────────────────────────
 * Owner, 07/09/2026: *"the design looks AI generated… make it easier and more accessible on
 * mobile, easier to write a review or add an image, use icons, take the long texts out."*
 *
 * Measured before this rewrite, at 390 on the stub server:
 *
 *   composer height   846px   — on a 900px viewport. The form did not fit on one screen.
 *   prose             299 characters across 3 blocks, in a form with 4 inputs.
 *   element order     h3 · "Nom affiché" label · input · honeypot · "Votre note" legend ·
 *                     radiogroup · the first star
 *
 * THE RATING WAS THE SIXTH ELEMENT. The one field a review cannot exist without sat below an
 * OPTIONAL name box, under a heading and a sentence about the product you are already looking
 * at. That ordering is most of what reads as machine-written here: every field given equal
 * weight, in the order the data model happens to list them, with a paragraph explaining each.
 *
 * ── SO THE FORM ASKS ONE QUESTION FIRST ─────────────────────────────────────────────────────
 * It opens as a row of five large stars and nothing else. Everything after them — the comment,
 * the photos, the guest name, the submit — mounts only once a rating exists. Progressive
 * disclosure, and the reason it is right here rather than merely tidy: a rating is one tap, and
 * a person who has tapped it has already started. The comment box appearing *in response* is a
 * far smaller ask than the same box presented cold under four other fields.
 *
 * Initial height is ~210px instead of 846px, so the whole first step is on screen with the
 * product still visible above it.
 *
 * ── PHOTOS ARE PROMOTED, NOT TOLERATED ──────────────────────────────────────────────────────
 * Baymard's finding is that reviewer images are the single most trusted element of a review
 * section — shoppers use them to check the studio photography is honest — and that a third of
 * storefronts still do not accept them. This form accepted them behind a dashed grey outline
 * labelled "(optionnel)" with a line of file-format small print under it, which is how you
 * collect none. It is now a tile the same size and shape as the thumbnails it sits beside, so
 * adding a photo reads as continuing a row rather than opening a file dialog.
 *
 * ── THE PROSE IS GONE, AND THAT IS DELIBERATE ───────────────────────────────────────────────
 * 299 characters became ~90. Three blocks were deleted outright:
 *
 *   "Aidez un autre client à choisir <PRODUCT NAME>."   the product is the page you are on
 *   "JPG, PNG ou WebP · 5 Mo maximum par photo"          the picker enforces it; the toast says
 *                                                        so on the one file that fails
 *   the four-line Protina/abuse paragraph                its one load-bearing clause — that the
 *                                                        reward needs a verified phone — is now
 *                                                        one line beside the button that earns it
 *
 * Nothing true was removed. Rules that only matter when broken are stated when they break.
 */

const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_COMMENT = 15;
const MAX_COMMENT = 1000;

/** The word under the stars. A number needs decoding; "Excellent" does not. */
const RATING_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

interface ReviewComposerProps {
  productId: number;
  productName: string;
  onClose: () => void;
  onSubmitted?: (result: ReviewSubmitResult) => void;
}

function apiMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export function ReviewComposer({ productId, productName, onClose, onSubmitted }: ReviewComposerProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [access, setAccess] = useState<ReviewAccess | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ReviewSubmitResult | null>(null);
  const openedAt = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setLoading(true);
    getReviewAccess(productId)
      .then((value) => active && setAccess(value))
      .catch(() => active && toast.error('Impossible de vérifier votre accès aux avis.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [isAuthenticated, productId]);

  /* The comment box is what the rating reveals, so it takes focus the moment it exists — one
     tap to rate, then type. Skipped when a rating is being CHANGED rather than first set, which
     would otherwise yank the page back up mid-edit. */
  const rate = (value: number) => {
    const first = stars === 0;
    setStars(value);
    if (first) requestAnimationFrame(() => commentRef.current?.focus({ preventScroll: true }));
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name} : utilisez une photo JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} dépasse 5 Mo.`);
        continue;
      }
      if (next.length >= MAX_IMAGES) break;
      next.push(file);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  };

  const tooShort = comment.trim().length < MIN_COMMENT;

  const submit = async () => {
    if (stars < 1) return toast.error('Choisissez une note de 1 à 5 étoiles.');
    if (tooShort) {
      toast.error(`Écrivez au moins ${MIN_COMMENT} caractères.`);
      commentRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = isAuthenticated
        ? await addReview({ product_id: productId, stars, comment: comment.trim(), compose_ms: Date.now() - openedAt.current, hp_field: honeypot, images: files })
        : await addGuestReview({ product_id: productId, stars, comment: comment.trim(), author_name: guestName.trim() || undefined, compose_ms: Date.now() - openedAt.current, hp_field: honeypot, images: files })
          .then((value) => ({ ...value, verified_purchase: false, reward_points: 0, remaining_this_month: 0, review: { id: value.id, stars, comment: comment.trim() } }));
      setSuccess(result);
      onSubmitted?.(result);
      toast.success(result.message);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(apiMessage(error) || (status === 429
        ? 'Votre limite de 3 avis est atteinte pour ce mois.'
        : 'Votre avis n’a pas été envoyé. Vos informations sont conservées.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (isAuthenticated && (loading || !access))) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-2xl border border-hairline bg-sunken">
        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Chargement" />
      </div>
    );
  }

  if (isAuthenticated && access?.already_reviewed) {
    return (
      <ReviewState icon={CheckCircle2} title="Avis déjà envoyé" text="Un avis par produit.">
        <Link href="/account?section=reviews" className="flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-elevated px-4 text-sm font-semibold text-ink-1">Voir mes avis</Link>
      </ReviewState>
    );
  }

  if (isAuthenticated && access && access.remaining_this_month <= 0) {
    const reset = new Date(access.resets_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return <ReviewState icon={Clock3} title="3 avis publiés ce mois-ci" text={`Quota renouvelé le ${reset}.`} />;
  }

  if (success) {
    return (
      <ReviewState
        icon={CheckCircle2}
        title="Merci pour votre avis"
        text={success.published ? 'Votre avis est publié.' : 'Visible après vérification.'}
      >
        {success.reward_points > 0 && (
          <p className="inline-flex rounded-xl border border-ok/30 bg-elevated px-3 py-2 text-sm font-semibold text-ok">
            <ProtinaAmount value={success.reward_points} signed /> <span className="ms-1.5">après contrôle</span>
          </p>
        )}
      </ReviewState>
    );
  }

  const shown = hoverStars || stars;
  const rewardPoints = access?.reward_points ?? 0;

  return (
    <div className="relative min-w-0 rounded-2xl border border-brand/25 bg-sunken p-4 sm:p-5">
      {/* The close control is an icon at the edge, not a full-width "Annuler" button competing
          with the submit. Cancelling is a rare, reversible action; it does not need equal weight. */}
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        aria-label="Fermer"
        className="absolute end-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-elevated hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* ── STEP ONE, AND UNTIL IT IS ANSWERED IT IS THE ONLY STEP ────────────────────────── */}
      <fieldset className="pe-12">
        <legend className="font-display text-base font-bold uppercase tracking-tight text-ink-1">
          Votre note
        </legend>
        <div
          className="mt-2.5 flex items-center gap-0.5"
          role="radiogroup"
          aria-label="Note du produit"
          onMouseLeave={() => setHoverStars(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={stars === value}
              onClick={() => rate(value)}
              onMouseEnter={() => setHoverStars(value)}
              onFocus={() => setHoverStars(value)}
              onBlur={() => setHoverStars(0)}
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              aria-label={`${value} étoile${value > 1 ? 's' : ''} — ${RATING_WORDS[value]}`}
            >
              {/*
                36px, not 28px. The old glyph was 28px and unselected stars were `text-hairline`
                — the 1px-divider grey — so the control a review cannot be written without was
                both the smallest thing in the form and the faintest. `text-rule-strong` is the
                grey that is meant to be seen.
              */}
              <Star
                className={`h-9 w-9 transition-colors ${value <= shown ? 'fill-amber-400 text-amber-400' : 'text-rule-strong'}`}
                aria-hidden="true"
              />
            </button>
          ))}
          <span className="ms-2 min-w-0 text-sm font-semibold text-ink-2" aria-live="polite">
            {shown ? RATING_WORDS[shown] : ''}
          </span>
        </div>
        {stars === 0 && (
          <p className="mt-1.5 text-xs text-ink-3">Touchez une étoile pour commencer.</p>
        )}
      </fieldset>

      {/* A field no human can see. Named `hp_field` — `website` and `company` are names browsers
          autofill, and an autofilled honeypot silently discards a real customer's review. It sat
          on `id="review-website"` with no `name` at all until 07/09/2026, which is both the
          autofill risk this comment warns about and invisible to `measure-reviews`, whose count
          of honeypots on an open product page read 1 where it should read 2. */}
      <label htmlFor="review-hp" className="absolute h-px w-px overflow-hidden [clip-path:inset(50%)]">Ne pas remplir</label>
      <input
        id="review-hp"
        name="hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-px w-px overflow-hidden border-0 p-0 opacity-0 [clip-path:inset(50%)]"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
      />

      {stars > 0 && (
        <div className="mt-4 space-y-4 border-t border-hairline pt-4">
          <div>
            <label htmlFor="review-comment" className="sr-only">Votre expérience</label>
            <textarea
              ref={commentRef}
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT))}
              rows={4}
              className="w-full resize-y rounded-xl border border-hairline bg-elevated px-3 py-3 text-base leading-snug text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              placeholder="Qualité, goût, résultats, utilisation…"
            />
            {/* The counter only exists while it means something: a minimum you have not met, or
                a maximum you are approaching. It was two permanent labels under every textarea. */}
            {comment.length > 0 && (tooShort || comment.length > MAX_COMMENT - 100) && (
              <p className="mt-1 text-end text-xs tabular-nums text-ink-3">
                {tooShort ? `Encore ${MIN_COMMENT - comment.trim().length}` : `${comment.length}/${MAX_COMMENT}`}
              </p>
            )}
          </div>

          {/* ── PHOTOS: A TILE IN A ROW OF TILES ──────────────────────────────────────────── */}
          <div>
            <ul className="flex flex-wrap items-center gap-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-hairline bg-elevated">
                  <Image src={previews[index]} alt={`Photo ${index + 1}`} fill sizes="80px" className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    className="absolute end-0.5 top-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/65 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Supprimer la photo ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {files.length < MAX_IMAGES && (
                <li>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id="review-images" onChange={(event) => addFiles(event.target.files)} />
                  <label
                    htmlFor="review-images"
                    className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-brand/40 bg-elevated text-brand transition-colors hover:border-brand hover:bg-brand/5"
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[11px] font-semibold">Photo</span>
                  </label>
                </li>
              )}
            </ul>
          </div>

          {!isAuthenticated && (
            <div>
              <label htmlFor="review-guest-name" className="sr-only">Nom affiché</label>
              <input
                id="review-guest-name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value.slice(0, 60))}
                className="h-12 w-full rounded-xl border border-hairline bg-elevated px-3 text-base text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                placeholder="Votre nom (facultatif)"
              />
            </div>
          )}

          {access?.verified_purchase && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok">
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Achat vérifié
            </p>
          )}

          <div>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="min-h-12 w-full rounded-xl bg-brand font-display font-bold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
            >
              {submitting ? <><Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />Envoi…</> : 'Publier mon avis'}
            </Button>
            {/* One line, and only the clause that changes what happens: the reward is real but
                conditional. The rest of the old four-line paragraph said nothing a reader needed
                before submitting. */}
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-3">
              <span>Publication immédiate.</span>
              {rewardPoints > 0 && <span>Jusqu’à {rewardPoints} Protinas si votre téléphone est vérifié.</span>}
            </p>
          </div>
        </div>
      )}

      {/* `productName` stays in the props and the DOM for assistive technology — the visible
          sentence that used to print it was a line of prose about the page you are already on. */}
      <span className="sr-only">Avis sur {productName}</span>
    </div>
  );
}

function ReviewState({ icon: Icon, title, text, children }: { icon: typeof BadgeCheck; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-sunken p-5 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 font-display text-base font-bold uppercase tracking-tight text-ink-1">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-2">{text}</p>
      {children && <div className="mx-auto mt-3 max-w-sm">{children}</div>}
    </div>
  );
}
