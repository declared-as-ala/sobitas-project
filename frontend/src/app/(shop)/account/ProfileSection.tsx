'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { BadgeCheck, Check, CircleAlert, Loader2, Save, User, Mail, Phone, Megaphone } from 'lucide-react';
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
    marketing_email_opt_in: user?.marketing_email_status === 'pending' || (user?.marketing_email_opt_in ?? false),
  });

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      marketing_email_opt_in: user?.marketing_email_status === 'pending' || (user?.marketing_email_opt_in ?? false),
    }));
  }, [user]);

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
        marketing_email_opt_in: formData.marketing_email_opt_in,
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

          {!user?.phone_verified && <LinkWithLoading href="/verify-account" className="flex min-h-11 items-center justify-center rounded-xl border border-brand bg-elevated px-4 text-sm font-semibold text-brand">Vérifier mon compte</LinkWithLoading>}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-sunken p-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Megaphone className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-1">Recevoir les offres utiles</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-3">Nouveautés et promotions Protein.tn, au maximum une fois par semaine. Désinscription en un clic.</span>
              {user?.marketing_email_status === 'pending' && (
                <span className="mt-2 block text-xs font-semibold text-brand">Confirmation envoyée : ouvrez votre email pour activer les offres.</span>
              )}
            </span>
            {/*
              ── A 20px CONSENT CONTROL, ON THE ONE PAGE PEOPLE OPEN ONE-HANDED ──────────────
              `measure-account` failed this at every width in both themes and for both
              fixtures — 20 identical failures, one cause: `input:Recevoir les offres
              Protein.(20px)`. It was `h-5 w-5`, a native checkbox, and it is the control that
              turns email marketing on and off. A mis-tap here either signs somebody up for
              mail they did not ask for or silently drops a consent they did give.

              The enclosing <label> is the whole card, so the tap already worked. That is not
              the same claim: WCAG 2.5.8 is about the TARGET, and a guard that reads the input
              cannot see a lane drawn by a parent. Rather than argue with the measurement, the
              input now IS 44x44.

              WHICH MEANS IT CANNOT STAY NATIVE. Chrome ignores border, padding and outline on
              `input[type=checkbox]` — measured all three, the box stays 20px — and the only
              thing that grows it is an explicit width/height, which also scales the tick into
              a 44px glyph. So the input is `appearance-none`, sized 44x44, laid over a 20px
              box that draws the state. Same markup, same handler, same label; the visible
              checkbox is the size it always was and the target is finally the size it claimed.
            */}
            <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={formData.marketing_email_opt_in}
                onChange={(event) => setFormData({ ...formData, marketing_email_opt_in: event.target.checked })}
                className="peer absolute inset-0 h-11 w-11 cursor-pointer appearance-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label="Recevoir les offres Protein.tn par email"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-md border border-rule bg-canvas text-on-brand transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:[&>svg]:opacity-100"
              >
                {/* `[&>svg]` on the parent, not `peer-checked:` on the icon: `peer-*` compiles
                    to a sibling combinator, and the icon is a descendant of the peer's sibling,
                    not a sibling itself — written the other way it silently never matches. */}
                <Check className="h-3.5 w-3.5 opacity-0 transition-opacity" strokeWidth={3} aria-hidden="true" />
              </span>
            </span>
          </label>

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
