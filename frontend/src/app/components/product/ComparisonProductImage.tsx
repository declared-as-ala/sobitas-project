'use client';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { getStorageUrl } from '@/services/api';
export function ComparisonProductImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-sunken">
    {src && !failed ? <Image src={getStorageUrl(src)} alt={name} fill sizes="80px" className="object-contain p-1" onError={() => setFailed(true)} /> : <Package className="h-7 w-7 text-ink-3" aria-label="Photo indisponible" />}
  </span>;
}
