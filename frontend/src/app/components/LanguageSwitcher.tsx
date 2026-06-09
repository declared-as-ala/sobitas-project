'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import { useI18n } from '@/i18n/I18nProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { Locale } from '@/i18n';

const LANGUAGES: Array<{ locale: Locale; label: string; shortLabel: string; dir: 'ltr' | 'rtl' }> = [
  { locale: 'fr', label: 'Français', shortLabel: 'FR', dir: 'ltr' },
  { locale: 'en', label: 'English', shortLabel: 'EN', dir: 'ltr' },
  { locale: 'ar', label: 'العربية', shortLabel: 'AR', dir: 'rtl' },
];

export function LanguageSwitcher({
  className,
  mobile = false,
}: {
  className?: string;
  mobile?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const current = LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            mobile
              ? 'w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1'
              : 'h-10 min-w-10 px-2.5 text-white hover:bg-red-700 dark:hover:bg-red-800 gap-1.5 font-semibold',
            className,
          )}
          aria-label={`${t('language.current')}: ${current.label}. ${t('language.switchTo')}`}
          title={t('language.switchTo')}
          data-i18n-skip
        >
          <Languages className={cn('h-5 w-5 shrink-0', mobile && 'me-3')} aria-hidden />
          <span lang={current.locale} dir={current.dir}>{mobile ? current.label : current.shortLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mobile ? 'start' : 'end'}
        className="z-[9999] min-w-[160px]"
        data-i18n-skip
      >
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.locale}
            onClick={() => setLocale(language.locale)}
            className={cn('justify-between py-2.5', locale === language.locale && 'font-bold text-red-600')}
            lang={language.locale}
            dir={language.dir}
          >
            <span>{language.label}</span>
            <span className="text-xs opacity-60">{language.shortLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
