'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BadgeCheck, Camera, CheckCircle2, Clock3, Loader2, Star, Trash2, UserRound } from 'lucide-react';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { addGuestReview, addReview, getReviewAccess } from '@/services/api';
import type { ReviewAccess, ReviewSubmitResult } from '@/types';
import { notify as toast } from '@/lib/notify';
import { ProtinaAmount } from '@/app/components/loyalty/Protina';

const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ReviewSubmitResult | null>(null);
  const openedAt = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
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

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Utilisez une photo JPG, PNG ou WebP.');
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

  const submit = async () => {
    if (stars < 1) return toast.error('Choisissez une note de 1 à 5 étoiles.');
    if (comment.trim().length < 15) return toast.error('Écrivez au moins 15 caractères.');
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

  if (authLoading || (isAuthenticated && (loading || !access))) return <div className="flex min-h-40 items-center justify-center rounded-xl border border-hairline bg-sunken"><Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Chargement" /></div>;

  if (isAuthenticated && access?.already_reviewed) {
    return <ReviewState icon={CheckCircle2} title="Avis déjà envoyé" text="Vous ne pouvez publier qu’un avis par produit.">
      <Link href="/account?section=reviews" className="flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-elevated px-4 text-sm font-semibold text-ink-1">Voir mes avis</Link>
    </ReviewState>;
  }

  if (isAuthenticated && access && access.remaining_this_month <= 0) {
    const reset = new Date(access.resets_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return <ReviewState icon={Clock3} title="3 avis publiés ce mois-ci" text={`Votre quota sera renouvelé le ${reset}.`} />;
  }

  if (success) {
    return <ReviewState icon={CheckCircle2} title="Merci pour votre avis" text={success.published ? 'Votre avis est publié.' : 'Votre avis est enregistré et sera visible après vérification.'}>
      {success.reward_points > 0 && <p className="rounded-xl border border-ok/30 bg-ok/5 px-3 py-2 text-sm font-semibold text-ok"><ProtinaAmount value={success.reward_points} signed /> créditées après contrôle</p>}
    </ReviewState>;
  }

  return (
    <div className="relative min-w-0 rounded-xl border border-brand/25 bg-sunken p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink-1">Votre avis</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-2">Aidez un autre client à choisir {productName}.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && access && <span className="rounded-full border border-hairline bg-elevated px-2.5 py-1 text-xs font-semibold text-ink-2">{access.remaining_this_month}/{access.monthly_limit} restants</span>}
          {access?.reward_points ? <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-xs font-bold text-brand"><ProtinaAmount value={access.reward_points} signed /></span> : <span className="rounded-full border border-hairline bg-elevated px-2.5 py-1 text-xs font-semibold text-ink-2">Publication directe</span>}
        </div>
      </div>

      {access?.verified_purchase && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ok"><BadgeCheck className="h-4 w-4" /> Achat vérifié détecté : 50 Protinas après contrôle</p>}
      {!isAuthenticated && <label htmlFor="review-guest-name" className="mt-4 block text-sm font-bold text-ink-1"><span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4 text-brand" /> Nom affiché <span className="font-normal text-ink-3">(optionnel)</span></span><input id="review-guest-name" value={guestName} onChange={(event) => setGuestName(event.target.value.slice(0, 60))} className="mt-2 h-11 w-full rounded-xl border border-hairline bg-elevated px-3 text-base text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" placeholder="Anonyme" /></label>}

      <div className="pointer-events-none absolute h-px w-px overflow-hidden [clip-path:inset(50%)]" aria-hidden="true">
        <label htmlFor="review-website">Ne pas remplir</label>
        <input id="review-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-ink-1">Votre note *</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Note du produit">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={stars === value} onClick={() => setStars(value)} className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label={`${value} étoile${value > 1 ? 's' : ''}`}><Star className={`h-7 w-7 ${value <= stars ? 'fill-amber-400 text-amber-400' : 'text-hairline'}`} /></button>)}
        </div>
      </fieldset>

      <label htmlFor="review-comment" className="mt-4 block text-sm font-bold text-ink-1">Votre expérience *</label>
      <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1000))} rows={4} minLength={15} maxLength={1000} className="mt-2 w-full resize-y rounded-xl border border-hairline bg-elevated px-3 py-3 text-base text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" placeholder="Qualité, goût, résultats, utilisation…" />
      <div className="mt-1 flex justify-between text-xs text-ink-3"><span>15 caractères minimum</span><span className="tabular-nums">{comment.length}/1000</span></div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-ink-1">Photos <span className="font-normal text-ink-3">(optionnel)</span></p><span className="text-xs text-ink-3">{files.length}/{MAX_IMAGES}</span></div>
        {files.length > 0 && <ul className="mt-2 grid grid-cols-3 gap-2 sm:max-w-md">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`} className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-elevated"><Image src={previews[index]} alt={`Photo ${index + 1}`} fill sizes="140px" className="object-cover" unoptimized /><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white focus-visible:ring-2 focus-visible:ring-white" aria-label={`Supprimer la photo ${index + 1}`}><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
        {files.length < MAX_IMAGES && <><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id="review-images" onChange={(event) => addFiles(event.target.files)} /><label htmlFor="review-images" className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand/35 bg-elevated px-4 text-sm font-semibold text-brand hover:bg-brand/5"><Camera className="h-4 w-4" />Ajouter des photos</label><p className="mt-1.5 text-xs text-ink-3">JPG, PNG ou WebP · 5 Mo maximum par photo</p></>}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button type="button" onClick={() => void submit()} disabled={submitting} className="min-h-12 rounded-xl bg-brand font-display font-bold uppercase tracking-wide text-on-brand hover:bg-brand-hover">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</> : access?.reward_points ? `Publier · +${access.reward_points} Protinas` : 'Publier mon avis'}</Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="min-h-11 rounded-xl">Annuler</Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">Publication immédiate. Les Protinas sont réservées aux membres dont le téléphone est vérifié et restent contrôlées contre les abus. Ne montrez aucune donnée personnelle sur les photos.</p>
    </div>
  );
}

function ReviewState({ icon: Icon, title, text, children }: { icon: typeof BadgeCheck; title: string; text: string; children?: ReactNode }) {
  return <div className="rounded-xl border border-hairline bg-sunken p-5 text-center sm:p-6"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon className="h-6 w-6" /></span><h3 className="mt-3 font-display text-lg font-bold uppercase tracking-tight text-ink-1">{title}</h3><p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-2">{text}</p>{children && <div className="mx-auto mt-4 max-w-sm">{children}</div>}</div>;
}
