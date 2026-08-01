import type { ElementType, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/**
 * The horizontal content rail (DESIGN_SYSTEM.md v3 §7).
 *
 * Replaces `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, which is copy-pasted inline across
 * nearly every page and section in the app. Server component — no `'use client'`.
 *
 * On `wide`: the codebase currently runs TWO rails — DESIGN_SYSTEM §7 mandates `max-w-7xl`,
 * but the header and the homepage SEO strip use `max-w-site`. Shipping both means
 * adopting this primitive is a pure refactor with zero pixel movement. Unifying them is a
 * separate, deliberate decision — do not silently collapse `wide` into `default`.
 */
const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-site',
  full: 'max-w-none',
} as const;

export type ContainerWidth = keyof typeof WIDTHS;

export interface ContainerProps {
  as?: ElementType;
  width?: ContainerWidth;
  /** Drop the horizontal padding (for full-bleed children that manage their own gutters). */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}

export function Container({
  as: Tag = 'div',
  width = 'default',
  bleed = false,
  className,
  children,
}: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full', WIDTHS[width], !bleed && 'px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </Tag>
  );
}
