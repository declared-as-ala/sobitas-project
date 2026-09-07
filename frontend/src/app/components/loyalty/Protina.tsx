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

/**
 * `compact` drops the word from the VISIBLE text and keeps it for screen readers.
 *
 * Written for the Protina history rows, where the label is redundant three times over — the
 * card is titled "Historique Protina", the balance above it is in Protinas, and every row
 * carries the coin. Measured: "+249 Protinas" is ~105px at every width, and at 320 that left
 * the transaction's own description 56px — six characters — so `break-words` split "gagnées"
 * into "gagnée" and "s" and one row grew to 307px.
 *
 * The number alone is ~55px. The sr-only twin means nothing is lost to a screen reader, which
 * hears "+249 Protinas" exactly as before.
 */
export function ProtinaAmount({ value, signed = false, compact = false, className }: { value: number; signed?: boolean; compact?: boolean; className?: string }) {
  const amount = Math.trunc(value);
  const prefix = signed && amount > 0 ? '+' : '';
  const figure = `${prefix}${amount.toLocaleString('fr-FR')}`;
  const word = Math.abs(amount) === 1 ? 'Protina' : 'Protinas';
  return (
    <span className={cn('inline-flex items-center gap-1.5 tabular-nums', className)}>
      <ProtinaMark size="xs" />
      {compact ? (
        <>
          <span aria-hidden="true">{figure}</span>
          <span className="sr-only">{figure} {word}</span>
        </>
      ) : (
        <span>{figure} {word}</span>
      )}
    </span>
  );
}
