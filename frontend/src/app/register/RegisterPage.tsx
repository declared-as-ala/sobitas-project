'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { getStorageUrl } from '@/services/api';

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

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Header />
      
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <Link href="/" className="flex items-center justify-center">
                  <Image
                    src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                    alt="Sobitas Logo"
                    width={140}
                    height={45}
                    className="h-10 w-auto object-contain"
                    style={{ maxWidth: '140px', height: 'auto' }}
                    priority
                  />
                </Link>
              </div>
              <CardTitle className="text-3xl font-bold mb-2">Créer un compte</CardTitle>
              <CardDescription>
                Rejoignez-nous pour profiter de nos services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="pl-10"
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
                      className="pl-10"
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
                      className="pl-10"
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
                      className="pl-10"
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
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
                      className="pl-10"
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
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

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vous avez déjà un compte ?{' '}
                  <Link
                    href="/login"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
