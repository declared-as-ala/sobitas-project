'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Building2, Mail, MapPin, Phone, UserRound, Users } from 'lucide-react';
import { AuthField, AuthSubmit } from '@/app/components/AuthShell';
import {
  GOUVERNORATS,
  identityErrors,
  type AffiliateProfile,
  type IdentityValues,
} from '../affiliateCopy';
import { BackButton, ErrorNote, SelectField, StepHeading } from './signupUi';

/**
 * Step 2 — who you are and how we reach you.
 *
 * ── FIVE FIELDS, AND WHY NOT SEVEN ────────────────────────────────────────────────────────
 * The page this replaces asked for a free-text "un mot sur vous" and a message. Both were
 * optional and both were friction on the screen that decides whether the form gets finished at
 * all — and neither is needed, because the last screen promises a phone call and that call is
 * where the context actually comes from. What survives is the minimum an administrator needs to
 * review and ring back: a name, a way to call, a way to write, and a governorate.
 *
 * `audience_size` stays because it is the one number that lets somebody calibrate an offer
 * before the call, and it is genuinely optional — labelled as such, never validated.
 *
 * ── ERRORS APPEAR AFTER A FIELD HAS BEEN LEFT, NOT WHILE IT IS BEING TYPED ────────────────
 * Validating on every keystroke marks a half-typed e-mail as wrong before anyone has finished
 * writing it, which reads as the form arguing with you. Each field goes "touched" on blur, and
 * pressing the primary action touches all of them at once so nothing can be submitted with a
 * silent problem.
 */
export function StepIdentity({
  profile,
  values,
  onChange,
  onBack,
  onSubmit,
  busy,
  serverError,
}: {
  profile: AffiliateProfile;
  values: IdentityValues;
  onChange: (values: IdentityValues) => void;
  onBack: () => void;
  onSubmit: () => void;
  busy: boolean;
  serverError: string | null;
}) {
  const [touched, setTouched] = useState<Partial<Record<keyof IdentityValues, boolean>>>({});
  const errors = useMemo(() => identityErrors(values, profile), [values, profile]);

  const set = (key: keyof IdentityValues) => (value: string) => onChange({ ...values, [key]: value });
  const touch = (key: keyof IdentityValues) => () => setTouched((t) => ({ ...t, [key]: true }));
  const errorFor = (key: keyof IdentityValues) => (touched[key] ? errors[key] : undefined);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, business: true, email: true, phone: true, city: true });
    if (Object.keys(errors).length > 0) {
      // Send focus to the first thing that is wrong. Without this, a phone user who fills the
      // form top-down and fails on `city` sees a button that "does nothing" — the message is
      // three fields above the fold they are looking at.
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <BackButton onClick={onBack} label="Changer de profil" />

      <div className="mt-3">
        <StepHeading title="Vos coordonnées">
          Nous vous appelons sur ce numéro pour valider votre dossier. Utilisez celui que vous
          consultez le plus.
        </StepHeading>
      </div>

      {serverError && <ErrorNote>{serverError}</ErrorNote>}

      <div className="space-y-4">
        <AuthField
          label={profile.nameLabel}
          Icon={UserRound}
          autoComplete="name"
          value={values.name}
          onChange={(event) => set('name')(event.target.value)}
          onBlur={touch('name')}
          placeholder={profile.namePlaceholder}
          error={errorFor('name')}
          required
        />

        {profile.businessLabel && (
          <AuthField
            label={profile.businessLabel}
            Icon={Building2}
            autoComplete="organization"
            value={values.business}
            onChange={(event) => set('business')(event.target.value)}
            onBlur={touch('business')}
            placeholder={profile.businessPlaceholder}
            error={errorFor('business')}
            hint={profile.businessRequired ? undefined : 'Facultatif.'}
            required={profile.businessRequired}
          />
        )}

        {/* `type="tel"` + `inputMode="tel"` so the phone shows a dial pad, and the hint carries
            the format instead of a placeholder — a placeholder disappears the moment someone
            starts typing, which is exactly when they need to see the shape. */}
        <AuthField
          label="Numéro de téléphone"
          Icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          value={values.phone}
          onChange={(event) => set('phone')(event.target.value)}
          onBlur={touch('phone')}
          placeholder="20 123 456"
          error={errorFor('phone')}
          hint="8 chiffres. Vous recevrez un code par SMS à l’étape 4."
          required
        />

        <AuthField
          label="Adresse e-mail"
          Icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => set('email')(event.target.value)}
          onBlur={touch('email')}
          placeholder="vous@exemple.tn"
          error={errorFor('email')}
          required
        />

        <SelectField
          label="Gouvernorat"
          Icon={MapPin}
          value={values.city}
          onChange={(value) => {
            set('city')(value);
            setTouched((t) => ({ ...t, city: true }));
          }}
          options={GOUVERNORATS}
          placeholder="Choisissez dans la liste"
          error={errorFor('city')}
        />

        <AuthField
          label={profile.audienceLabel}
          Icon={Users}
          inputMode="numeric"
          value={values.audience}
          onChange={(event) => set('audience')(event.target.value)}
          placeholder={profile.audiencePlaceholder}
          hint="Facultatif. Cela nous aide à préparer votre offre avant l’appel."
        />
      </div>

      <div className="mt-6">
        <AuthSubmit loading={busy} loadingLabel="Enregistrement…">
          Continuer
          <ArrowRight className="h-4 w-4" aria-hidden />
        </AuthSubmit>
        <p className="mt-3 text-xs leading-relaxed text-ink-3">
          Vos coordonnées servent uniquement à traiter votre demande d’affiliation. Elles ne sont
          ni revendues ni utilisées pour autre chose.
        </p>
      </div>
    </form>
  );
}
