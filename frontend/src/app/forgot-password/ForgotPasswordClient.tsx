'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/services/api';
import { toast } from 'sonner';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setDone(true);
      toast.success(res.message);
    } catch {
      toast.error('Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Card className="border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="text-center">
            <span className="inline-flex items-center justify-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
              <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
              Récupération
            </span>
            <CardTitle className="font-display uppercase tracking-tight text-3xl font-bold text-gray-900 dark:text-white">Mot de passe oublié</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {done
                ? 'Si un compte correspond à cet e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.'
                : 'Indiquez votre adresse e-mail. Nous vous enverrons un lien sécurisé.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!done ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Envoi…
                    </>
                  ) : (
                    'Envoyer le lien'
                  )}
                </Button>
              </form>
            ) : null}
            <Button
              variant="ghost"
              className="mt-6 w-full text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              asChild
            >
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la connexion
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
