import { cn } from '@/app/components/ui/utils';

/**
 * The red eyebrow label (DESIGN_SYSTEM.md v3 §1).
 *
 * Extracted verbatim from SectionHeader.tsx, where this exact markup is duplicated in
 * HeroSlider and the header mobile sheet. Server component.
 *
 * `rule={false}` drops the leading hairline for tight spots (over imagery, inside chips).
 */
export interface KickerProps {
  children: React.ReactNode;
  rule?: boolean;
  /** Use on dark/photographic backgrounds where red-600 lacks contrast. */
  tone?: 'brand' | 'onDark';
  className?: string;
}

export function Kicker({ children, rule = true, tone = 'brand', className }: KickerProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold',
        tone === 'brand' ? 'text-red-600 dark:text-red-400' : 'text-red-500',
        className,
      )}
    >
      {rule && (
        <span
          className={cn('h-px w-5', tone === 'brand' ? 'bg-red-600 dark:bg-red-400' : 'bg-red-500')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
