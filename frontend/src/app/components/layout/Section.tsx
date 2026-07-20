import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { Container, type ContainerWidth } from './Container';

/**
 * Vertical section rhythm (DESIGN_SYSTEM.md v3 §7).
 *
 * Replaces `py-12 sm:py-16 lg:py-20`, copy-pasted inline across every home/listing section.
 * One rhythm across the whole site — never invent `py-8` or `py-28` locally. Server component.
 *
 * `surface="sunken"` paints the warm sand band used to separate adjacent sections without
 * drawing a border; it is theme-aware via --c-sunken, so dark mode comes for free.
 */
const SPACING = {
  none: '',
  tight: 'py-6 sm:py-8 lg:py-10',
  default: 'py-12 sm:py-16 lg:py-20',
  flagship: 'py-16 sm:py-20 lg:py-24',
} as const;

const SURFACES = {
  base: '',
  sunken: 'bg-sunken',
  elevated: 'bg-elevated',
} as const;

export interface SectionProps {
  as?: 'section' | 'div' | 'article' | 'aside';
  spacing?: keyof typeof SPACING;
  surface?: keyof typeof SURFACES;
  /** Set false for full-bleed sections (e.g. the hero) that own their rail. */
  container?: boolean;
  width?: ContainerWidth;
  className?: string;
  containerClassName?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: ReactNode;
}

export function Section({
  as: Tag = 'section',
  spacing = 'default',
  surface = 'base',
  container = true,
  width = 'default',
  className,
  containerClassName,
  children,
  ...rest
}: SectionProps) {
  return (
    <Tag className={cn(SPACING[spacing], SURFACES[surface], className)} {...rest}>
      {container ? (
        <Container width={width} className={containerClassName}>
          {children}
        </Container>
      ) : (
        children
      )}
    </Tag>
  );
}
