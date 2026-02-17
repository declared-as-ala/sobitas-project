'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const ProviderTree = dynamic(
  () => import('@/app/ProviderTree').then((m) => ({ default: m.ProviderTree })),
  { ssr: true }
);

export function Providers({ children }: { children: ReactNode }) {
  return <ProviderTree>{children}</ProviderTree>;
}
