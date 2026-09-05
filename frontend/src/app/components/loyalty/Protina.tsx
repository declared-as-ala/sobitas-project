import Image from 'next/image';
import { cn } from '@/app/components/ui/utils';

type ProtinaMarkProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  decorative?: boolean;
};

const sizes = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
  lg: 'h-14 w-14',
};

/** The single loyalty mark used across the shop and member application. */
export function ProtinaMark({ size = 'sm', className, decorative = true }: ProtinaMarkProps) {
  return (
    <span className={cn('relative inline-block shrink-0', sizes[size], className)}>
      <Image
        src="/member/protein-point-coin.webp"
        alt={decorative ? '' : 'Protina'}
        fill
        sizes={size === 'lg' ? '56px' : size === 'md' ? '36px' : size === 'sm' ? '24px' : '16px'}
        className="object-contain"
        aria-hidden={decorative || undefined}
      />
    </span>
  );
}

export function ProtinaAmount({ value, signed = false, className }: { value: number; signed?: boolean; className?: string }) {
  const amount = Math.trunc(value);
  const prefix = signed && amount > 0 ? '+' : '';
  return (
    <span className={cn('inline-flex items-center gap-1.5 tabular-nums', className)}>
      <ProtinaMark size="xs" />
      <span>{prefix}{amount.toLocaleString('fr-FR')} {Math.abs(amount) === 1 ? 'Protina' : 'Protinas'}</span>
    </span>
  );
}
