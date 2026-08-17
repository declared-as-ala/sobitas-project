'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUp, ArrowUpRight, Facebook, Instagram, Linkedin, Loader2, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { subscribeNewsletter, getCmsPages, getCoordinates } from '@/services/api';
import type { Coordinate } from '@/types';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { toast } from 'sonner';
import type { CmsPage } from '@/services/api';

interface FooterClientProps {
  pages?: CmsPage[];
}

/** Single source for the newsletter subtitle so both breakpoints read identically. */
const NEWSLETTER_SUBTITLE = 'Recevez les dernières offres exclusives et nouveautés.';

export function FooterClient({ pages: pagesProp }: FooterClientProps) {
  const { footerLogoUrl } = useSiteLogos();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  // Server-fetched footer chrome (root layout → SiteChromeProvider): the CMS links + address are in
  // the SSR HTML (crawlable, no post-hydration pop-in) and not re-fetched on every navigation.
  const { cmsPages: ssrPages, coordinates: ssrCoord } = useSiteChrome();
  const [pages, setPages] = useState<CmsPage[]>(pagesProp ?? (ssrPages.length > 0 ? ssrPages : []));
  const [coord, setCoord] = useState<Coordinate | null>(ssrCoord);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fallback only: fetch client-side when the server didn't supply coordinates.
    if (ssrCoord) return;
    getCoordinates().then(setCoord).catch(() => {});
  }, [ssrCoord]);

  // The /coordonnees API returns the raw Coordinate model, so use its real
  // column names (adresse_fr/adresse, phone_1, phone_2, email).
  const contactAddress = coord?.adresse_fr || coord?.adresse || '';
  // Default Google Maps embed for PROTEIN.TN (Sousse). Used as a fallback when
  // the /coordonnees API doesn't return a gelocalisation embed.
  const DEFAULT_MAP_EMBED =
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3234.515082636619!2d10.630613400000001!3d35.8363715!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1302131b30e891b1%3A0x51dae0f25849b20c!2sPROTEIN.TN%20-%20PROTEINE%20TUNISIE!5e0!3m2!1sen!2stn!4v1782430269530!5m2!1sen!2stn" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  const mapEmbedHtml = coord?.gelocalisation || DEFAULT_MAP_EMBED;
  const contactEmail = coord?.email || 'contact@protein.tn';
  const contactPhones = [coord?.phone_1, coord?.phone_2].filter(Boolean).join(' / ') || '+216 27 612 500 / +216 73 200 169';
  const contactPhoneHref = `tel:${String(coord?.phone_1 || '+21627612500').replace(/\s/g, '')}`;
  /* Opens the address in whatever maps app the visitor has, with no iframe involved. `?api=1` is
     Google's documented, key-free URL form. */
  const mapsLinkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    contactAddress ? `PROTEIN.TN ${contactAddress}` : 'PROTEIN.TN PROTEINE TUNISIE Sousse'
  )}`;

  // Fetch CMS pages only as a fallback: props > server (SiteChromeProvider) > client fetch.
  useEffect(() => {
    if (pagesProp && pagesProp.length > 0) {
      setPages(pagesProp);
      return;
    }
    if (ssrPages.length > 0) {
      setPages(ssrPages);
      return;
    }
    getCmsPages().then(setPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagesProp]);

  // Show all API pages in footer
  const footerPages = pages;

  // Lazy load Google Maps only when footer is visible (Intersection Observer).
  // Depend on mapEmbedHtml so the observer attaches once the map element is
  // actually rendered — coord loads async, so on first mount the ref is null.
/*
   * ── THE MAP LOADS WHEN SOMEBODY ASKS FOR IT ────────────────────────────────────────────────
   * Owner, 17/08/2026: *"the footer also polish it, make renders fast"*.
   *
   * This used to mount the Google Maps embed as soon as an IntersectionObserver saw the footer
   * approach the viewport. That is the standard "lazy" pattern and on this site it was close to no
   * saving at all: the footer is at the bottom of every page, so "near the viewport" means "the
   * reader scrolled down", which is most sessions. A Maps embed is a third-party iframe that pulls
   * several hundred kilobytes of script and a dozen tile requests and runs its own main thread —
   * spent, on every page, to render a picture of a street almost nobody was looking for.
   *
   * It is now a poster with the address on it and a button. The reader who wants the map presses
   * once; everyone else pays nothing. The "Ouvrir dans Google Maps" link beside it needs no iframe
   * at all and is the better answer for a phone anyway, because it hands the address to the
   * navigation app the visitor actually uses.
   */

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setIsSubscribing(true);
    try {
      const result = await subscribeNewsletter({ email: newsletterEmail });
      if ('success' in result) {
        toast.success(result.success || 'Inscription réussie !');
        setNewsletterEmail('');
      } else if ('error' in result) {
        toast.error(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  /*
   * ── ONE FOOTER ──────────────────────────────────────────────────────────────────────────────
   * Owner, 17/08/2026: *"the footer, redesign it, make it polished and clean, handmade, like a
   * human designed it"*.
   *
   * It was TWO complete trees — a `md:hidden` stack and a `hidden md:grid` four-up — and that is
   * the whole reason it read as assembled rather than designed. The same six navigation links, the
   * same seven categories, the same five social buttons, the same newsletter form and the same
   * three contact rows, each written twice, ~330 lines, with two sets of spacing decisions that had
   * already drifted apart: the phone stack put Services above Navigation and the desktop grid put
   * Contact first; the phone links were `space-y-1.5` with `min-h-11` rows and the desktop ones
   * `space-y-3` with no minimum at all. Nobody chose either rhythm.
   *
   * This is the same defect, and the same fix, as the product hero four days ago: ONE tree, and the
   * difference between a phone and a desktop is a grid change, which is what CSS grid is for.
   *
   * ── AND IT IS ON THE DESIGN SYSTEM'S OWN DARK SCOPE ─────────────────────────────────────────
   * `bg-gray-950 text-gray-300 border-gray-800`, `bg-gray-800/60` separators, `bg-gray-800`
   * social buttons, `hover:bg-red-600`, `text-red-500`, `bg-gray-800 border-gray-700` inputs — 93
   * violations by the design lint's count, on a component that renders on every page of the site.
   *
   * `.pt-slab` is the system's dark band: it re-points every token underneath it, so everything in
   * here is written exactly as it would be on a white card — `text-ink-1`, `border-hairline`,
   * `bg-elevated`, `text-brand` — with no `dark:` variant and no hardcoded grey anywhere. Those
   * values were contrast-checked when the scope was built; the ones I would have picked by eye
   * were not. DESIGN_SYSTEM.md names this footer as the one screen that SHOULD be dark, and this
   * is what being dark is supposed to mean here.
   *
   * ── THE ORDER ───────────────────────────────────────────────────────────────────────────────
   * Brand and the newsletter first, because the newsletter is the only thing in a footer that can
   * still earn something; then four equal columns of links; then where to find the shop; then one
   * quiet legal line. A footer's job is to be scannable and to prove the shop is real, and the
   * second half of that is why the address, the phone and the map are here and not folded away.
   */
  const year = new Date().getFullYear();

  const NAVIGATION: Array<[string, string]> = [
    ['/', 'Accueil'],
    ['/shop', 'Nos produits'],
    ['/packs', 'Packs'],
    ['/blog', 'Blog'],
    ['/contact', 'Contact'],
    ['/proteine-sousse', 'Protéine à Sousse'],
  ];

  const CATEGORIES: Array<[string, string]> = [
    ['/whey-proteine', 'Whey protéine'],
    ['/creatine', 'Créatine'],
    ['/gainers-proteines', 'Gainers'],
    ['/prise-de-masse', 'Prise de masse'],
    ['/perte-de-poids', 'Perte de poids'],
    ['/pre-workout', 'Pre-workout'],
    ['/brands', 'Toutes les marques'],
  ];

  const SOCIALS: Array<{ href: string; label: string; icon: React.ReactNode }> = [
    { href: 'https://facebook.com/proteinetunisie', label: 'Facebook', icon: <Facebook className="h-[18px] w-[18px]" /> },
    { href: 'https://www.instagram.com/sobitas.proteine.tunisie/', label: 'Instagram', icon: <Instagram className="h-[18px] w-[18px]" /> },
    { href: 'https://www.linkedin.com/in/sobitas-proteine-tunisie-b63b671a8/', label: 'LinkedIn', icon: <Linkedin className="h-[18px] w-[18px]" /> },
    {
      href: 'https://www.tiktok.com/@sobitas.proteine.tunisie',
      label: 'TikTok',
      icon: (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
    },
    { href: 'https://www.youtube.com/@proteine-tunisie', label: 'YouTube', icon: <Youtube className="h-[18px] w-[18px]" /> },
  ];

  return (
    <footer id="contact" className="pt-slab border-t border-hairline">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8">

        {/* ── BRAND + NEWSLETTER ─────────────────────────────────────────────────────────── */}
        <div className="grid gap-8 border-b border-hairline py-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-12">
          <div className="min-w-0">
            <Link href="/" className="inline-block transition-opacity hover:opacity-80">
              <Image
                src={footerLogoUrl}
                alt="Proteine Tunisie"
                width={230}
                height={75}
                className="h-11 w-auto object-contain sm:h-14"
                sizes="230px"
                loading="lazy"
              />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              Compléments alimentaires authentiques, sélectionnés et livrés partout en Tunisie.
              Paiement à la livraison, expédition sous 24–72h.
            </p>
          </div>

          {/* The newsletter is the only element in a footer that can still earn something, so it
              gets half the band rather than a quarter of a column. */}
          <form onSubmit={handleNewsletterSubmit} className="min-w-0 lg:justify-self-end lg:max-w-md">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink-1">
              Abonnez-vous
            </h2>
            <p className="mt-1.5 text-sm text-ink-2">{NEWSLETTER_SUBTITLE}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="Votre adresse email…"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl border-hairline bg-elevated text-ink-1 placeholder:text-ink-3"
                aria-label="Votre adresse email"
                required
              />
              <Button
                type="submit"
                className="h-12 shrink-0 rounded-xl px-6 font-display font-semibold uppercase tracking-wide"
                disabled={isSubscribing}
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" /> Inscription…
                  </>
                ) : (
                  "S'abonner"
                )}
              </Button>
            </div>
            <p className="mt-2.5 text-xs text-ink-3">
              En vous abonnant, vous acceptez de recevoir nos offres par email.
            </p>
          </form>
        </div>

        {/* ── FOUR COLUMNS ───────────────────────────────────────────────────────────────── */}
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10 lg:py-12">
          <FooterLinkColumn title="Navigation" links={NAVIGATION} />
          <FooterLinkColumn title="Catégories" links={CATEGORIES} />

          <div className="min-w-0">
            <FooterHeading>Services &amp; ventes</FooterHeading>
            <ul className="mt-4 space-y-0.5">
              {footerPages.map((p) => (
                <li key={p.id}>
                  {p.slug ? (
                    <Link href={`/${p.slug}`} className={FOOTER_LINK}>
                      {p.title}
                    </Link>
                  ) : (
                    <span className="flex min-h-[44px] items-center text-sm text-ink-3 sm:min-h-[36px]">
                      {p.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <FooterHeading>Nous contacter</FooterHeading>
            <ul className="mt-4 space-y-0.5">
              <li>
                <a href={contactPhoneHref} className={FOOTER_LINK} aria-label="Appeler la boutique">
                  <Phone className="me-2.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 break-words">{contactPhones}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className={FOOTER_LINK}>
                  <Mail className="me-2.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 break-words">{contactEmail}</span>
                </a>
              </li>
              {contactAddress && (
                <li className="flex min-h-[44px] items-start py-2 text-sm text-ink-2 sm:min-h-[36px]">
                  <MapPin className="me-2.5 mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 break-words">{contactAddress}</span>
                </li>
              )}
            </ul>

            {/* Social buttons are `bg-elevated` on the slab — a fill that already resolves against
                this band — rather than a hand-picked `bg-gray-800`. Hover goes to the brand, which
                on the slab is the lighter #FF8A4C, not the page's #D53B04. That is the scope doing
                its job: the same class, the correct colour for the surface it lands on. */}
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label={label}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── WHERE THE SHOP IS ──────────────────────────────────────────────────────────── */}
        {mapEmbedHtml && (
          <div className="border-t border-hairline py-8 lg:py-10" ref={mapRef}>
            <FooterHeading>Nous trouver</FooterHeading>
            <div className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-elevated">
              {shouldLoadMap ? (
                <div
                  className="h-56 w-full sm:h-72 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: mapEmbedHtml }}
                />
              ) : (
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-1">PROTEIN.TN — Protéine Tunisie</p>
                      {contactAddress && (
                        <p className="mt-0.5 break-words text-sm text-ink-2">{contactAddress}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShouldLoadMap(true)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-hairline px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Afficher la carte
                    </button>
                    <a
                      href={mapsLinkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-hairline px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Itinéraire
                      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── LEGAL LINE ───────────────────────────────────────────────────────────────────── */}
      <div className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-site flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-3 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {year}{' '}
            <span className="font-display font-semibold uppercase tracking-wide text-brand">
              Proteine Tunisie
            </span>
            . Tous droits réservés.
          </p>
          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="-my-2 inline-flex min-h-[44px] items-center gap-1.5 py-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Haut de page
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

/**
 * One class string for every link in the footer, so the four columns cannot drift the way the two
 * trees did. `min-h-[44px]` on a phone is the tap floor; `sm:min-h-[36px]` keeps a seven-item
 * column from being 308px tall on a desktop where the pointer is a mouse — still well clear of the
 * 24px minimum target size, which is the criterion that actually applies to a list of text links.
 */
const FOOTER_LINK =
  'flex min-h-[44px] items-center py-2 text-sm text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-[36px]';

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">{children}</h2>
  );
}

function FooterLinkColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="min-w-0">
      <FooterHeading>{title}</FooterHeading>
      <ul className="mt-4 space-y-0.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className={FOOTER_LINK}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
