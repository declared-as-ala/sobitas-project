'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { BadgeCheck, CircleAlert, Loader2, Save, User, Mail, Phone } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

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
    <Card className="rounded-xl border border-hairline bg-elevated shadow-sm">
      <CardHeader className="border-b border-hairline">
        <CardTitle className="font-display uppercase tracking-tight text-xl text-ink-1">
          Informations personnelles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-3" aria-hidden="true" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 rounded-xl pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="email">Email</Label><span className={user?.email_verified ? 'inline-flex items-center gap-1 text-xs font-semibold text-ok' : 'inline-flex items-center gap-1 text-xs text-ink-3'}>{user?.email_verified ? <BadgeCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}{user?.email_verified ? 'Vérifié' : 'Non vérifié'}</span></div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-3" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 rounded-xl pl-10"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="phone">Téléphone</Label><span className={user?.phone_verified ? 'inline-flex items-center gap-1 text-xs font-semibold text-ok' : 'inline-flex items-center gap-1 text-xs text-ink-3'}>{user?.phone_verified ? <BadgeCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}{user?.phone_verified ? 'Vérifié' : 'Non vérifié'}</span></div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-3" aria-hidden="true" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12 rounded-xl pl-10"
              />
            </div>
            <p className="text-xs leading-relaxed text-ink-3">Modifier le numéro retire sa vérification jusqu’à la saisie d’un nouveau code SMS.</p>
          </div>

          {!user?.phone_verified && <LinkWithLoading href="/verify-account" className="flex min-h-11 items-center justify-center rounded-xl border border-brand bg-brand-50 px-4 text-sm font-semibold text-brand">Vérifier mon compte</LinkWithLoading>}

          <div className="pt-6 border-t border-hairline">
            <h3 className="font-display uppercase tracking-tight text-lg text-ink-1 mb-4">
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
                  className="h-12 rounded-xl"
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
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            /* h-12 to match the fields above it (they were 40px, and so was this), and `text-on-brand`
                 rather than `text-white`: --c-on-brand is near-BLACK in dark mode, because white
                 on the dark accent #FF8A4C measures ~2.2:1. This was the last hardcoded white-on-
                 accent control on the page. */
            className="h-12 w-full rounded-xl bg-brand font-display uppercase tracking-wide text-on-brand hover:bg-brand-hover"
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
