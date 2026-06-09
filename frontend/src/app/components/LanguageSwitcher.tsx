'use client';

import { Check, Languages } from 'lucide-react';
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

const LANGUAGES: Array<{ locale: Locale; label: string; shortLabel: string; flag: string; dir: 'ltr' | 'rtl' }> = [
  { locale: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷', dir: 'ltr' },
  { locale: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', dir: 'ltr' },
  { locale: 'ar', label: 'العربية', shortLabel: 'AR', flag: '🇹🇳', dir: 'rtl' },
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
              : 'h-9 px-2.5 text-white hover:bg-white/20 dark:hover:bg-white/10 gap-1.5 font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-all',
            className,
          )}
          aria-label={`${t('language.current')}: ${current.label}. ${t('language.switchTo')}`}
          title={t('language.switchTo')}
          data-i18n-skip
        >
          <Languages className={cn('h-4 w-4 shrink-0', mobile && 'me-3')} aria-hidden />
          <span lang={current.locale} dir={current.dir} className="text-sm font-bold">
            {mobile ? current.label : current.shortLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mobile ? 'start' : 'end'}
        sideOffset={8}
        className="z-[9999] w-48 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl overflow-hidden"
        data-i18n-skip
      >
        {LANGUAGES.map((language) => {
          const isActive = locale === language.locale;
          return (
            <DropdownMenuItem
              key={language.locale}
              onClick={() => setLocale(language.locale)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                isActive
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
              lang={language.locale}
              dir={language.dir}
            >
              <span className="text-base leading-none">{language.flag}</span>
              <span className="flex-1 font-medium text-sm">{language.label}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
