'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { AuthShell, AuthCardHeader } from '@/app/components/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already authenticated (using useEffect to avoid render error)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Show loading while checking auth status
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Don't render form if authenticated (will redirect)
  if (isAuthenticated) {
    return <LoadingSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    // Must match the backend rule (min 8, at least one letter and one digit) so the form rejects
    // bad passwords up-front with a clear message instead of surfacing a backend 422.
    if (
      formData.password.length < 8 ||
      !/[A-Za-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role_id: 2, // Default role for customers
      });
      toast.success('Compte créé avec succès !');
      // Use setTimeout to ensure smooth transition
      setTimeout(() => {
        router.push('/');
      }, 300);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'inscription');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCardHeader
        showLogo
        kicker="Rejoignez-nous"
        title="Créer un compte"
        subtitle="Rejoignez-nous pour profiter de nos services"
      />
      <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jean Dupont"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Au moins 8 caractères, dont une lettre et un chiffre.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10 h-11 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Vous avez déjà un compte ?{' '}
          <Link
            href="/login"
            className="font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
