'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAffiliate } from '@/services/affiliatePortal';
import { AffiliateShell } from '../AffiliateShell';

/**
 * Guard for the authenticated affiliate portal. The `login` route sits OUTSIDE this route group,
 * so it never mounts this layout — which also keeps the signed-out login page free of the stateful
 * client boundary this component introduces (that boundary shifted React's useId tree position and
 * produced a hydration mismatch when login lived under it). Every page in `(portal)/` requires a
 * signed-in user who is an APPROVED affiliate: a signed-out visitor is bounced to /affiliate/login,
 * a signed-in non-affiliate to /partenaires. The layout stays mounted across sub-page navigation,
 * so the affiliate check runs once on entry, not per page.
 */
export default function AffiliatePortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/affiliate/login');
      return;
    }

    let alive = true;
    setStatus('checking');
    checkIsAffiliate().then((ok) => {
      if (!alive) return;
      if (ok) {
        setStatus('ok');
      } else {
        setStatus('denied');
        router.replace('/partenaires');
      }
    });

    return () => {
      alive = false;
    };
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || status !== 'ok') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sunken">
        <div className="flex flex-col items-center gap-3 text-ink-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-brand" aria-hidden />
          <p className="text-sm">{status === 'denied' ? 'Redirection…' : 'Chargement de votre espace…'}</p>
        </div>
      </div>
    );
  }

  return <AffiliateShell>{children}</AffiliateShell>;
}
