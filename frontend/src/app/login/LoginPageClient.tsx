'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock } from 'lucide-react';
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  /* `?email=` is set by the reset-password screen when it hands the customer back here, so they
     do not retype the address they just proved they own. */
  const [formData, setFormData] = useState({ email: searchParams.get('email') ?? '', password: '' });

  /*
    ── AN OPEN REDIRECT, CLOSED ──────────────────────────────────────────────────────────────
    `?redirect=` was pushed straight into router.push(). A link to
    /login?redirect=https://evil.example/login sends a customer who just typed their password to
    a page that looks like ours and asks for it again. Only a same-site PATH is accepted; anything
    else falls back to the homepage. `//host` is rejected too — the browser reads a
    protocol-relative URL as absolute.
  */
  const raw = searchParams.get('redirect') || '/';
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace(redirectTo);
  }, [isAuthenticated, authLoading, router, redirectTo]);

  if (authLoading || isAuthenticated) return <LoadingSpinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData);
      toast.success('Connexion réussie');
      router.replace(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la connexion');
      setIsLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      toast.success('Connexion réussie');
      router.replace(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connexion Google impossible');
      setGoogleLoading(false);
    }
  };

  const busy = isLoading || googleLoading;

  return (
    <AuthShell>
      <AuthCardHeader
        kicker="Espace client"
        title="Connexion"
        subtitle="Retrouvez vos commandes, vos points fidélité et vos adresses de livraison."
      />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <AuthField
          label="Email"
          Icon={Mail}
          type="email"
          inputMode="email"
          placeholder="votre@email.com"
          autoComplete="username"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <AuthField
          label="Mot de passe"
          Icon={Lock}
          reveal
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          action={
            <Link
              href="/forgot-password"
              /* `-my-3 py-3` grows the TARGET to 45px without growing the label row: the padding
                 makes it tappable, the negative margin gives the height back to the layout. At
                 21px it was the smallest control on the screen and it sits next to a field a
                 thumb is already aiming at. */
              className="-my-3 rounded py-3 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Mot de passe oublié ?
            </Link>
          }
        />

        <AuthSubmit loading={isLoading} loadingLabel="Connexion…" disabled={busy}>
          Se connecter
        </AuthSubmit>
      </form>

      {/* Renders nothing at all when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset — including the
          divider, which would otherwise separate the form from an empty space. */}
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="mt-5 space-y-4">
          <AuthDivider />
          <GoogleSignInButton onCredential={handleGoogle} disabled={busy} />
        </div>
      )}

      <AuthAlt question="Vous n’avez pas de compte ?" href="/register" cta="Créer un compte" />
    </AuthShell>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginContent />
    </Suspense>
  );
}
