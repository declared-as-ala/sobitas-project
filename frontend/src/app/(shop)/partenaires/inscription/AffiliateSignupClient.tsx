'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, BadgeCheck, Check, PhoneCall, RotateCcw, Tag } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { cn } from '@/app/components/ui/utils';
import { readReferralCode } from '@/util/referral';
import {
  affiliateProgramApi,
  type AffiliateApplication,
  type AffiliateApplicationSession,
  type AffiliateApplicantDetails,
  type AffiliateKind,
  type IdDocumentSide,
  type OtpChallenge,
} from '@/services/affiliateProgram';
import {
  AFFILIATE_PROFILES,
  EMPTY_IDENTITY,
  normalisePhone,
  parseAffiliateKind,
  profileOf,
  SIGNUP_STEPS,
  type IdentityValues,
  type SignupStepId,
} from '../affiliateCopy';
import { StepIdentity } from './StepIdentity';
import { StepKyc } from './StepKyc';
import { StepOtp } from './StepOtp';
import { BackButton, DemoNotice, SignupShell, StepHeading } from './signupUi';

/**
 * The affiliate signup — five screens, one at a time, resumable.
 *
 * ── WHY A STATE MACHINE AND NOT A LONG FORM ───────────────────────────────────────────────
 * The person filling this in is, in the owner's words, not necessarily somebody who understands
 * technology — a gym owner on a phone between two classes. A single scrolling form asks them to
 * hold five unrelated things in their head and shows them, at the top, everything they have not
 * done yet. Five screens ask one question each and show a bar that only moves forward.
 *
 * ── THE SERVER IS THE SOURCE OF TRUTH FOR PROGRESS ────────────────────────────────────────
 * The browser keeps a draft so a dropped session resumes, but that draft NEVER decides which
 * step you are on. On resume the application is re-read and `resumePhase()` puts the visitor on
 * the first genuinely incomplete step. A local `step: 'email'` in a hand-edited localStorage
 * value cannot skip the ID card, because the only thing that advances the flow is the server
 * saying the previous requirement is met.
 *
 * ── WHAT IS AND IS NOT PERSISTED ──────────────────────────────────────────────────────────
 * Persisted: the chosen profile, the typed contact details, the application id and its resume
 * token, and which details have already been sent. NOT persisted: the identity photos. The
 * server holds those and reports them back as two booleans; keeping a copy of somebody's CIN in
 * `localStorage` to make a resume prettier is the client-side version of the `disk('public')`
 * mistake the plan warns about (docs/affiliate-ecosystem-plan.md §8).
 */

type Phase = SignupStepId | 'done';

const DRAFT_KEY = 'pt_affilie_signup_v1';
/** A week. Long enough to come back after a weekend, short enough not to be a permanent record. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Draft {
  v: 1;
  phase: Phase;
  kind: AffiliateKind | null;
  identity: IdentityValues;
  session: AffiliateApplicationSession | null;
  /** JSON of the details last accepted by the server, so a no-op PATCH is never sent. */
  sentSignature: string | null;
  savedAt: number;
}

function readDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (draft.v !== 1 || Date.now() - draft.savedAt > DRAFT_TTL_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(draft: Omit<Draft, 'v' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, v: 1, savedAt: Date.now() }));
  } catch {
    /* Private mode or quota. The flow still works for the life of this tab. */
  }
}

function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Nothing to do; the TTL will retire it. */
  }
}

/**
 * The first step the server has NOT accepted yet.
 *
 * Deliberately ignores whatever the local draft claimed. Someone who closed the tab while typing
 * their address lands on the ID card rather than back in the form — one step later than they
 * left, never one step earlier — and "Modifier mes coordonnées" is the first control on that
 * screen if the details were what they came back to change.
 */
function resumePhase(application: AffiliateApplication): Phase {
  if (application.status !== 'draft') return 'done';
  if (!application.documents.front || !application.documents.back) return 'kyc';
  if (!application.phone_verified) return 'phone';
  return 'email';
}

const PHASE_INDEX: Record<Phase, number> = {
  type: 0,
  identity: 1,
  kyc: 2,
  phone: 3,
  email: 4,
  done: SIGNUP_STEPS.length,
};

const GENERIC_ERROR = "L'opération a échoué. Réessayez dans un instant, ou appelez-nous.";
const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : GENERIC_ERROR;

export function AffiliateSignupClient() {
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [phase, setPhase] = useState<Phase>('type');
  const [kind, setKind] = useState<AffiliateKind | null>(null);
  const [identity, setIdentity] = useState<IdentityValues>(EMPTY_IDENTITY);
  const [session, setSession] = useState<AffiliateApplicationSession | null>(null);
  const [sentSignature, setSentSignature] = useState<string | null>(null);
  const [application, setApplication] = useState<AffiliateApplication | null>(null);
  const [challenges, setChallenges] = useState<{ phone: OtpChallenge | null; email: OtpChallenge | null }>({
    phone: null,
    email: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo(() => profileOf(kind ?? 'individual'), [kind]);

  /* ── Hydrate ──────────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const draft = readDraft();
      const requestedKind = parseAffiliateKind(searchParams.get('type'));

      if (!draft) {
        // Arriving from a profile card on /partenaires: the choice is already made, so step 1
        // would be a screen that asks a question the visitor has just answered.
        if (requestedKind) {
          setKind(requestedKind);
          setPhase('identity');
        }
        setReady(true);
        return;
      }

      setKind(draft.kind);
      setIdentity(draft.identity);
      setSentSignature(draft.sentSignature);

      if (!draft.session) {
        // Nothing has reached the server yet, so a fresh `?type=` is a new intent and wins.
        if (requestedKind && requestedKind !== draft.kind) {
          setKind(requestedKind);
          setPhase('identity');
        } else {
          setPhase(draft.phase === 'done' ? 'type' : draft.phase);
          setResumed(draft.phase !== 'type');
        }
        setReady(true);
        return;
      }

      setSession(draft.session);
      try {
        const app = await affiliateProgramApi.getApplication(draft.session);
        if (cancelled) return;
        setApplication(app);
        setPhase(resumePhase(app));
        setResumed(app.status === 'draft');
      } catch {
        // The record is gone or the token expired. Start over rather than showing a screen that
        // cannot succeed — and say so, because a form that silently resets looks broken.
        if (cancelled) return;
        clearDraft();
        setSession(null);
        setSentSignature(null);
        setPhase(draft.kind ? 'identity' : 'type');
        setError(
          'Votre demande précédente a expiré. Vos informations sont toujours là : continuez, il faudra simplement renvoyer les photos.',
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
    // Runs once. `searchParams` is read for its initial value only — a later query change on the
    // same route must not reset a flow somebody is in the middle of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Persist ──────────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!ready) return;
    if (phase === 'done') {
      clearDraft();
      return;
    }
    writeDraft({ phase, kind, identity, session, sentSignature });
  }, [ready, phase, kind, identity, session, sentSignature]);

  /* ── Actions ──────────────────────────────────────────────────────────────────────────── */

  const goTo = useCallback((next: Phase) => {
    setError(null);
    setPhase(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const submitIdentity = useCallback(async () => {
    if (!kind) return;
    const details: AffiliateApplicantDetails = {
      type: kind,
      name: identity.name.trim(),
      business_name: identity.business.trim() || undefined,
      email: identity.email.trim(),
      phone: normalisePhone(identity.phone),
      city: identity.city,
      audience_size: identity.audience.trim() || undefined,
      // The attribution cookie an affiliate's own link may have set. Anticipated by
      // `PartnerApplication.referred_by_code`; captured client-side because the HTML is
      // edge-cached and a server-side read would attribute nothing for most visitors.
      referred_by_code: readReferralCode() ?? undefined,
    };
    const signature = JSON.stringify(details);

    // A no-op PATCH is not free: changing a contact invalidates the OTP for that contact, so
    // stepping back to review the form and stepping forward again would silently unverify a
    // phone number that was already confirmed.
    if (session && signature === sentSignature) {
      goTo('kyc');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (session) {
        const app = await affiliateProgramApi.updateApplication(session, details);
        setApplication(app);
        setChallenges({ phone: null, email: null });
      } else {
        const created = await affiliateProgramApi.createApplication(details);
        setSession({ id: created.id, resume_token: created.resume_token });
        setApplication(created);
      }
      setSentSignature(signature);
      goTo('kyc');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }, [kind, identity, session, sentSignature, goTo]);

  const uploadDocument = useCallback(
    async (side: IdDocumentSide, file: File) => {
      if (!session) throw new Error(GENERIC_ERROR);
      await affiliateProgramApi.uploadDocument(session, side, file);
      // The tile renders from the SERVER's view, so the local copy is patched rather than
      // trusted: this mirrors exactly what a re-read would return.
      setApplication((app) => (app ? { ...app, documents: { ...app.documents, [side]: true } } : app));
    },
    [session],
  );

  const sendOtp = useCallback(
    async (channel: 'phone' | 'email') => {
      if (!session) return;
      setBusy(true);
      setError(null);
      try {
        const challenge = await affiliateProgramApi.sendOtp(session, channel);
        setChallenges((current) => ({ ...current, [channel]: challenge }));
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setBusy(false);
      }
    },
    [session],
  );

  const verifyOtp = useCallback(
    async (channel: 'phone' | 'email', code: string) => {
      if (!session) return;
      setBusy(true);
      setError(null);
      try {
        const app = await affiliateProgramApi.verifyOtp(session, channel, code);
        setApplication(app);
        setChallenges((current) => ({ ...current, [channel]: null }));
      } catch (err) {
        setError(messageOf(err));
        // A wrong code burns an attempt server-side; reflect the new count without a re-send.
        setChallenges((current) => {
          const challenge = current[channel];
          if (!challenge) return current;
          return {
            ...current,
            [channel]: { ...challenge, attempts_remaining: Math.max(0, challenge.attempts_remaining - 1) },
          };
        });
      } finally {
        setBusy(false);
      }
    },
    [session],
  );

  const submitApplication = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const app = await affiliateProgramApi.submitApplication(session);
      setApplication(app);
      goTo('done');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }, [session, goTo]);

  const restart = useCallback(() => {
    clearDraft();
    setPhase('type');
    setKind(null);
    setIdentity(EMPTY_IDENTITY);
    setSession(null);
    setSentSignature(null);
    setApplication(null);
    setChallenges({ phone: null, email: null });
    setError(null);
  }, []);

  /* ── Render ───────────────────────────────────────────────────────────────────────────── */

  // Nothing is drawn until the draft has been read. Rendering step 1 first and then jumping to
  // step 4 is worse than a beat of nothing: the visitor sees the form reset itself.
  if (!ready) {
    return (
      <SignupShell stepIndex={0} stepId="loading">
        <div className="space-y-3" aria-busy>
          <span className="block h-7 w-1/2 animate-pulse rounded-lg bg-sunken" />
          <span className="block h-4 w-3/4 animate-pulse rounded-lg bg-sunken" />
          <span className="block h-28 w-full animate-pulse rounded-xl bg-sunken" />
          <span className="block h-28 w-full animate-pulse rounded-xl bg-sunken" />
          <span className="sr-only">Chargement de votre inscription…</span>
        </div>
      </SignupShell>
    );
  }

  return (
    <SignupShell
      stepIndex={PHASE_INDEX[phase]}
      stepId={phase}
      demoNotice={affiliateProgramApi.isStub && phase !== 'done' ? <DemoNotice /> : undefined}
    >
      {resumed && phase !== 'done' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-sunken p-3">
          <p className="text-sm text-ink-2">Nous avons retrouvé votre demande en cours.</p>
          <button
            type="button"
            onClick={restart}
            className="-my-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Tout recommencer
          </button>
        </div>
      )}

      {phase === 'type' && (
        <StepType
          selected={kind}
          onSelect={(next) => {
            setKind(next);
            goTo('identity');
          }}
        />
      )}

      {phase === 'identity' && (
        <StepIdentity
          profile={profile}
          values={identity}
          onChange={setIdentity}
          onBack={() => goTo('type')}
          onSubmit={() => void submitIdentity()}
          busy={busy}
          serverError={error}
        />
      )}

      {phase === 'kyc' && application && (
        <StepKyc
          received={application.documents}
          onUpload={uploadDocument}
          onBack={() => goTo('identity')}
          onSubmit={() => goTo('phone')}
          serverError={error}
        />
      )}

      {phase === 'phone' && application && (
        <StepOtp
          channel="phone"
          destination={application.masked_phone}
          verified={application.phone_verified}
          challenge={challenges.phone}
          onSend={() => void sendOtp('phone')}
          onVerify={(code) => void verifyOtp('phone', code)}
          onContinue={() => goTo('email')}
          onBack={() => goTo('identity')}
          busy={busy}
          serverError={error}
          continueLabel="Continuer"
        />
      )}

      {phase === 'email' && application && (
        <StepOtp
          channel="email"
          destination={application.masked_email}
          verified={application.email_verified}
          challenge={challenges.email}
          onSend={() => void sendOtp('email')}
          onVerify={(code) => void verifyOtp('email', code)}
          onContinue={() => void submitApplication()}
          onBack={() => goTo('identity')}
          busy={busy}
          serverError={error}
          continueLabel="Envoyer ma demande"
        />
      )}

      {phase === 'done' && <StepDone application={application} />}

      {/* A step that lost its application record — only reachable by tampering with the draft —
          still has to say something a person can act on rather than rendering an empty card. */}
      {!application && (phase === 'kyc' || phase === 'phone' || phase === 'email') && (
        <div>
          <StepHeading title="Reprenons du début">
            Nous ne retrouvons plus votre demande. Vos coordonnées sont conservées : il suffit de
            les confirmer.
          </StepHeading>
          <BackButton onClick={() => goTo('identity')} label="Revenir à mes coordonnées" />
        </div>
      )}
    </SignupShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Step 1
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * Four cards, and tapping one ADVANCES.
 *
 * A select-then-confirm pattern is two taps for a question with no ambiguity, and the second tap
 * is the one people miss on a phone because the button is below the fold under four cards. The
 * cost of getting it wrong is one tap back — "Changer de profil" is the first control on the next
 * screen — which is cheaper than the tap it saves for everyone who gets it right.
 */
function StepType({
  selected,
  onSelect,
}: {
  selected: AffiliateKind | null;
  onSelect: (kind: AffiliateKind) => void;
}) {
  return (
    <div>
      <StepHeading title="Vous êtes…">
        Choisissez ce qui vous décrit le mieux. Cela ne change ni vos droits ni votre commission,
        seulement les questions que nous vous poserons.
      </StepHeading>

      <div className="grid grid-cols-1 gap-3">
        {AFFILIATE_PROFILES.map((option) => {
          const Icon = option.icon;
          const active = selected === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => onSelect(option.kind)}
              className={cn(
                'group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                active
                  ? 'border-brand bg-elevated'
                  : 'border-rule bg-elevated [@media(hover:hover)]:hover:border-brand',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-brand text-on-brand' : 'bg-sunken text-brand',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-extrabold uppercase leading-none tracking-tight text-ink-1">
                  {option.label}
                </span>
                <span className="mt-1 block text-sm leading-snug text-ink-2">{option.tagline}</span>
              </span>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Confirmation
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * The last screen answers the only question left: what happens now, and when.
 *
 * "Merci, nous reviendrons vers vous" is what makes people phone the shop three days later. A
 * reference they can quote, a named delay, and the fact that a HUMAN will CALL them — on the
 * number they just confirmed — is the whole difference.
 */
function StepDone({ application }: { application: AffiliateApplication | null }) {
  const next = [
    {
      icon: BadgeCheck,
      title: 'Nous vérifions votre pièce d’identité',
      body: 'Sous 1 à 2 jours ouvrés. C’est une personne qui regarde, pas un robot.',
    },
    {
      icon: PhoneCall,
      title: 'Nous vous appelons',
      body: application
        ? `Au ${application.masked_phone}, pour convenir de votre commission et répondre à vos questions.`
        : 'Pour convenir de votre commission et répondre à vos questions.',
    },
    {
      icon: Tag,
      title: 'Vous recevez votre code et vos accès',
      body: 'Votre code de réduction, votre lien de suivi et l’accès à votre espace affilié.',
    },
  ];

  return (
    <div>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-ok/40 bg-elevated text-ok">
        <Check className="h-7 w-7" aria-hidden />
      </span>

      <StepHeading title="Demande envoyée">
        Merci. Votre dossier est complet et il est déjà dans notre file de vérification.
      </StepHeading>

      {application && (
        <p className="mb-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-hairline bg-sunken p-4 text-sm text-ink-2">
          Votre référence
          <strong className="font-display text-lg font-extrabold tracking-tight text-ink-1">
            {application.reference}
          </strong>
          <span className="w-full text-xs text-ink-3">Notez-la : elle nous permet de retrouver votre dossier.</span>
        </p>
      )}

      <ol className="space-y-3">
        {next.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3 rounded-xl border border-hairline bg-elevated p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-1">
                  <span className="text-ink-3">{index + 1}. </span>
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-2">{item.body}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-2">
        <LinkWithLoading
          href="/"
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-4 font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Retour à la boutique
        </LinkWithLoading>
        <LinkWithLoading
          href="/contact"
          className="flex min-h-[48px] items-center justify-center rounded-xl border border-rule-strong bg-elevated px-4 text-sm font-semibold text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Nous contacter
        </LinkWithLoading>
      </div>
    </div>
  );
}
