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
    confirmPassword: '',
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || isAuthenticated) return <LoadingSpinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = passwordProblem(formData.password);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role_id: 2, // customer; the server sets this itself and never trusts the field
      });
      toast.success('Compte créé, bienvenue');
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
      toast.success('Compte créé, bienvenue');
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
        kicker="Créer un compte"
        title="Rejoignez-nous"
        subtitle="Suivi de commande, historique et points fidélité — en une minute."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
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
          inputMode="tel"
          placeholder="+216 XX XXX XXX"
          autoComplete="tel"
          hint="Nous appelons ce numéro pour confirmer chaque commande."
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />

        <AuthField
          label="Mot de passe"
          Icon={Lock}
          reveal
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          hint="Au moins 8 caractères, dont une lettre et un chiffre."
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
        />

        <AuthField
          label="Confirmer le mot de passe"
          Icon={Lock}
          reveal
          placeholder="Retapez le mot de passe"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          minLength={8}
        />

        <AuthSubmit loading={isLoading} loadingLabel="Création…" disabled={busy}>
          Créer mon compte
        </AuthSubmit>
      </form>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="mt-5 space-y-4">
          <AuthDivider />
          <GoogleSignInButton onCredential={handleGoogle} disabled={busy} />
        </div>
      )}

      <AuthAlt question="Vous avez déjà un compte ?" href="/login" cta="Se connecter" />
    </AuthShell>
  );
}
