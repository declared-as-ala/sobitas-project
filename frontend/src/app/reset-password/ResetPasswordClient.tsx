'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Lock, Loader2, Mail } from 'lucide-react';
import { resetPasswordWithToken } from '@/services/api';
import { toast } from 'sonner';
import { AuthShell, AuthCardHeader } from '@/app/components/AuthShell';

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      toast.error('Lien invalide ou expiré.');
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordWithToken({
        email: email.trim(),
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success(res.message);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Réinitialisation impossible. Demandez un nouveau lien.');
    } finally {
      setLoading(false);
    }
  };

  const invalid = !token || !email;

  return (
    <AuthShell>
        {invalid ? (
          <Card className="border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <AuthCardHeader
              title="Lien invalide"
              subtitle="Utilisez le lien reçu par e-mail ou demandez une nouvelle réinitialisation."
            />
            <CardContent>
              <Button
                asChild
                variant="outline"
                className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Link href="/forgot-password">Demander un nouveau lien</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <AuthCardHeader
              kicker="Sécurité"
              title="Nouveau mot de passe"
              subtitle="Choisissez un mot de passe sécurisé (minimum 6 caractères)."
            />
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="pl-10 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirmer</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password_confirmation"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enregistrement…
                    </>
                  ) : (
                    'Enregistrer le mot de passe'
                  )}
                </Button>
              </form>
              <Button
                variant="ghost"
                className="mt-4 w-full text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                asChild
              >
                <Link href="/login">Connexion</Link>
              </Button>
            </CardContent>
          </Card>
        )}
    </AuthShell>
  );
}
