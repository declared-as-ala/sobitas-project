'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/services/api';
import { toast } from 'sonner';
import { AuthShell, AuthCardHeader } from '@/app/components/AuthShell';

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
    <AuthShell>
      <Card className="border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <AuthCardHeader
            kicker="Récupération"
            title="Mot de passe oublié"
            subtitle={
              done
                ? 'Si un compte correspond à cet e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.'
                : 'Indiquez votre adresse e-mail. Nous vous enverrons un lien sécurisé.'
            }
          />
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
    </AuthShell>
  );
}
