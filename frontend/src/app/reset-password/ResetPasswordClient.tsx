'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { resetPasswordWithToken } from '@/services/api';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Header />
      <main className="max-w-md mx-auto px-4 py-16">
        {invalid ? (
          <Card>
            <CardHeader>
              <CardTitle>Lien invalide</CardTitle>
              <CardDescription>
                Utilisez le lien reçu par e-mail ou demandez une nouvelle réinitialisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/forgot-password">Demander un nouveau lien</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
              <CardDescription>Choisissez un mot de passe sécurisé (minimum 6 caractères).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirmer</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password_confirmation"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pl-9"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
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
              <Button variant="ghost" className="mt-4 w-full" asChild>
                <Link href="/login">Connexion</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
