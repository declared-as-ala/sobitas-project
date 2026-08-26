'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import {
  AuthShell,
  AuthCardHeader,
  AuthField,
  AuthSubmit,
  AuthDivider,
  AuthAlt,
} from '@/app/components/AuthShell';
import { GoogleSignInButton } from '@/app/components/auth/GoogleSignInButton';

/** Mirrors the backend rule (min 8, at least one letter and one digit) so the form rejects a bad
 *  password before the request rather than surfacing a 422 the customer cannot read. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre.';
  if (!/[0-9]/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre.';
  return null;
}

function normalizeTunisianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00216')) digits = digits.slice(5);
  if (digits.startsWith('216') && digits.length === 11) digits = digits.slice(3);

  return /^[234579]\d{7}$/.test(digits) ? `+216${digits}` : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || isAuthenticated) return <LoadingSpinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    if (name.length < 2) {
      toast.error('Saisissez votre nom complet.');
      return;
    }
    const problem = passwordProblem(formData.password);
    if (problem) {
      toast.error(problem);
      return;
    }
    const phone = normalizeTunisianPhone(formData.phone);
    if (!phone) {
      toast.error('Saisissez un numéro tunisien valide à 8 chiffres.');
      return;
    }
    /*
     * ── THE CONFIRM FIELD IS GONE (owner, 21/08/2026: "minimalistic", "fit the full height") ──
     * It existed to catch a typo in a field the user cannot see. This form has carried a
     * show/hide toggle on the password since the second pass, which solves the same problem by
     * letting them READ what they typed — and it solves it better, because a mistyped password
     * repeated identically twice passes a confirm field and still locks the account.
     *
     * It was also 110px on the screen that measured 507px too tall, and it never reached the
     * server: `register()` sends name, email, phone and password. Removing it changes what the
     * customer fills in, not what the backend receives.
     */

    setIsLoading(true);
    try {
      await register({
        name,
        email: formData.email.trim().toLowerCase(),
        phone,
        password: formData.password,
        role_id: 2, // customer; the server sets this itself and never trusts the field
      });
      toast.success('Compte créé !', {
        description: 'Bienvenue dans votre espace Protein.tn.',
      });
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l’inscription');
      /* `finally { setIsLoading(false) }` used to run on the SUCCESS path too, so the button
         flicked back to "Créer mon compte" for the 300ms before the redirect — long enough to be
         pressed a second time. It resets only on failure now. */
      setIsLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      toast.success('Compte créé !', {
        description: 'Bienvenue dans votre espace Protein.tn.',
      });
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Inscription Google impossible');
      setGoogleLoading(false);
    }
  };

  const busy = isLoading || googleLoading;

  return (
    <AuthShell>
      <AuthCardHeader
        title="Créer mon compte"
        subtitleDesktopOnly
        subtitle="Vos commandes et vos points, au même endroit."
      />

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <AuthField
          label="Nom complet"
          Icon={User}
          type="text"
          placeholder="Prénom et nom"
          autoComplete="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <AuthField
          label="Email"
          Icon={Mail}
          type="email"
          inputMode="email"
          placeholder="votre@email.com"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <AuthField
          label="Téléphone"
          Icon={Phone}
          type="tel"
          inputMode="numeric"
          placeholder="20 000 000"
          autoComplete="tel"
          maxLength={16}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />

        <AuthField
          label="Mot de passe"
          Icon={Lock}
          reveal
          placeholder="8 caractères, une lettre et un chiffre"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
        />

        <AuthSubmit loading={isLoading} loadingLabel="Création…" disabled={busy}>
          Créer mon compte
        </AuthSubmit>
      </form>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          <AuthDivider />
          <GoogleSignInButton onCredential={handleGoogle} disabled={busy} />
        </div>
      )}

      <AuthAlt question="Vous avez déjà un compte ?" href="/login" cta="Se connecter" />
    </AuthShell>
  );
}
