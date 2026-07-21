'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2, Save, User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ...(formData.password && { password: formData.password }),
      });
      toast.success('Profil mis à jour avec succès !');
      setFormData({ ...formData, password: '', confirmPassword: '' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="font-display uppercase tracking-tight text-xl text-gray-900 dark:text-white">
          Informations personnelles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10 rounded-xl focus-visible:border-red-500 focus-visible:ring-red-500/20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 rounded-xl focus-visible:border-red-500 focus-visible:ring-red-500/20"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pl-10 rounded-xl focus-visible:border-red-500 focus-visible:ring-red-500/20"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white mb-4">
              Changer le mot de passe
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Laisser vide pour ne pas changer"
                  autoComplete="new-password"
                  className="rounded-xl focus-visible:border-red-500 focus-visible:ring-red-500/20"
                />
              </div>

              {formData.password && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    className="rounded-xl focus-visible:border-red-500 focus-visible:ring-red-500/20"
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" aria-hidden="true" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
