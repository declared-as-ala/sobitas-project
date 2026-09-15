'use client';

import { Check, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { LOCALE_COOKIE, localizePath, stripLocalePrefix, type Locale } from '@/i18n';

const LANGUAGES: Array<{ locale: Locale; label: string; shortLabel: string; flag: string; dir: 'ltr' | 'rtl' }> = [
  { locale: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷', dir: 'ltr' },
  { locale: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', dir: 'ltr' },
  { locale: 'ar', label: 'العربية', shortLabel: 'AR', flag: '🇹🇳', dir: 'rtl' },
];

export function LanguageSwitcher({
  className,
  mobile = false,
  onNavigate,
}: {
  className?: string;
  mobile?: boolean;
  /** Called after a locale switch navigates — e.g. to close the mobile menu drawer. */
  onNavigate?: () => void;
}) {
  // Locale is now URL-driven (fr at root, /en, /ar) and resolved SSR by the middleware. Switching
  // NAVIGATES to the same page under the target locale prefix — no more client-side DOM text-swap
  // (which mixed languages and restored incompletely). next-intl's provider gives us the active
  // locale + translated labels; next/navigation gives us the current path to re-localize.
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];

  const switchTo = (target: Locale) => {
    if (target === locale) return;
    const { pathname: cleanPath } = stripLocalePrefix(pathname || '/');
    const query = searchParams?.toString();
    const href = localizePath(target, cleanPath) + (query ? `?${query}` : '');
    // Remember the choice so a later bare visit can honor it (middleware/UX may read it); the URL
    // stays the source of truth for what is actually rendered.
    try {
      document.cookie = `${LOCALE_COOKIE}=${target};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* cookies disabled — navigation below still applies the locale */
    }
    router.push(href);
    onNavigate?.();
  };

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
          aria-label={`${t('current')}: ${current.label}. ${t('switchTo')}`}
          title={t('switchTo')}
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
              onClick={() => switchTo(language.locale)}
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
