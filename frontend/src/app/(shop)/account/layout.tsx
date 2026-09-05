import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { MemberShell } from './MemberShell';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sunken" />}>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}
