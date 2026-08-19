'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUp, ArrowUpRight, Facebook, Instagram, Linkedin, Loader2, Mail, Map as MapIcon, MapPin, Phone, Youtube } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { subscribeNewsletter } from '@/services/api';
import { LEGAL_IDENTITY } from '@/util/company';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { toast } from 'sonner';
import type { CmsPage } from '@/services/api';

interface FooterClientProps {
  pages?: CmsPage[];
}

/*
 * ── THE FOOTER WAS HALF THE CONTACT PAGE ────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"redesign the footer, polish it and upgrade it, make it not that height too
 * much, use the full width of the page."*
 *
 * MEASURED before touching it, with scripts/measure-pages.mjs:
 *
 *              footer      /contact document    footer's share
 *   @390       1,652px           3,304px              50%
 *   @1536        906px           2,052px              44%
 *
 * Half of a page whose entire job is a phone number and a form. That is not a padding problem and
 * it was not fixed by shaving padding — it was FOUR stacked bands (brand+newsletter, four link
 * columns, a "Nous trouver" panel, the legal line), three of which were full-height rows of their
 * own on a 1600px rail that they each used about a third of.
 *
 * Three structural changes, in order of what they returned:
 *
 * 1. THE MAP PANEL IS GONE FROM THE RESTING FOOTER. It repeated the address that the contact
 *    column already carries, one band lower, and cost ~190px at every width on every page of the
 *    site to do it. The two controls it existed for — show the map, get directions — moved into
 *    the contact column beside the address they belong to, and the map itself renders as a band
 *    only once somebody presses for it. At rest that band does not exist.
 *
 * 2. THE NEWSLETTER IS A STRIP, NOT A HALF-BAND. It was a `lg:grid-cols-2` row where the form was
 *    capped at `max-w-md` — a 448px form and a 380px blurb sharing a 1600px rail, which is where
 *    "use the full width" came from. As one row (heading and blurb left, field and button right)
 *    it spans the whole rail and costs ~90px instead of ~200.
 *
 * 3. THE BRAND BLOCK JOINED THE COLUMN GRID as its first column rather than sitting in a band
 *    above it. Five columns across 1600px is what that rail is for; a two-row footer where row one
 *    is 40% empty is not.
 *
 * The four link columns themselves are unchanged in content. They are the part a footer is FOR,
 * and cutting links to buy height would have been trading the thing that works for the thing that
 * was broken.
 *
 * ── AND IT KEEPS ONE FOOT ON THE GROUND ─────────────────────────────────────────────────────
 * The legal line now carries the registered identity — RC and matricule fiscal, from the shop's
 * own /coordonnees record. For a Tunisian cash-on-delivery shop that is the single cheapest proof
 * that somebody real is on the other end of the order, and it belongs in the one place that
 * renders on every page. It is also where "SOBITAS" — the site's biggest single query, and absent
 * from indexed text since the rebrand — becomes machine-readable sitewide.
 *
 * ── THE DARK SCOPE, UNCHANGED AND STILL THE THING TO GET RIGHT ──────────────────────────────
 * `.pt-slab` re-points every token underneath it, so everything here is written exactly as it
 * would be on a white card — `text-ink-1`, `border-hairline`, `bg-sunken`, `text-brand` — with no
 * `dark:` variant and no hardcoded grey.
 *
 * `bg-elevated` IS WHITE ON THIS BAND (`--slab-elevated` is 255 255 255 in light theme) while
 * `--slab-ink-1` stays near-white, so `bg-elevated text-ink-1` here is white on white at ~1.04:1
 * — and only in light theme, because in dark the same classes are correct. A control on a slab is
 * a WELL, not a plate: `bg-sunken`. That trap caught the newsletter field, the social buttons and
 * the map card on the previous rewrite; it is why every fill in this file is `bg-sunken`.
 */

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

/** The rail. `max-w-site` (1600) is THE page container — see tailwind.config.ts. */
const RAIL = 'mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8';

/**
 * One class string for every link in the footer, so the columns cannot drift.
 * `min-h-[44px]` on a phone is the tap floor; `sm:min-h-[34px]` keeps a seven-item column from
 * being 308px tall on a desktop where the pointer is a mouse — still well clear of the 24px
 * minimum target size, which is the criterion that actually applies to a list of text links.
 */
const FOOTER_LINK =
  'flex min-h-[44px] items-center py-1.5 text-sm text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-[34px]';

/** Both map controls, and the "Haut de page" button, share one shape. */
const QUIET_BUTTON =
  'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-xs font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export function FooterClient({ pages: pagesProp }: FooterClientProps) {
  const { footerLogoUrl } = useSiteLogos();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  /*
   * Server-fetched footer chrome (root layout → SiteChromeProvider): the CMS links and the address
   * are in the SSR HTML — crawlable, no post-hydration pop-in — and not re-fetched on navigation.
   *
   * The two `useEffect` fallbacks that used to re-fetch both of these client-side are GONE. They
   * only ever fired when the server fetch had already failed, in which case the same request from
   * the browser was unlikely to do better, and they cost two network round-trips' worth of code
   * and a pair of state transitions on every page of the site to buy that. The provider is the
   * source.
   */
  const { cmsPages, coordinates: coord } = useSiteChrome();
  const footerPages = pagesProp && pagesProp.length > 0 ? pagesProp : cmsPages;

  // /coordonnees returns the raw Coordinate model, so these are its real column names.
  const contactAddress = coord?.adresse_fr?.trim() || coord?.adresse?.trim() || 'Rue Ribat, Sousse 4000';
  const contactEmail = coord?.email || 'contact@protein.tn';
  const contactPhones =
    [coord?.phone_1, coord?.phone_2].filter(Boolean).join(' / ') || '+216 27 612 500 / +216 73 200 169';
  const contactPhoneHref = `tel:${String(coord?.phone_1 || '+21627612500').replace(/\s/g, '')}`;

  /* Default Google Maps embed for PROTEIN.TN (Sousse), used when /coordonnees has none. */
  const DEFAULT_MAP_EMBED =
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3234.515082636619!2d10.630613400000001!3d35.8363715!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1302131b30e891b1%3A0x51dae0f25849b20c!2sPROTEIN.TN%20-%20PROTEINE%20TUNISIE!5e0!3m2!1sen!2stn!4v1782430269530!5m2!1sen!2stn" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  const mapEmbedHtml = coord?.gelocalisation || DEFAULT_MAP_EMBED;
  /* Opens the address in whatever maps app the visitor has, with no iframe involved. `?api=1` is
     Google's documented, key-free URL form — and on a phone it is the better answer than an
     embed, because it hands the address to the navigation app they actually use. */
  const mapsLinkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `PROTEIN.TN ${contactAddress}`
  )}`;

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
        toast.error(result.error || "Erreur lors de l'inscription");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setIsSubscribing(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="pt-slab border-t border-hairline">
      {/* ── NEWSLETTER ─────────────────────────────────────────────────────────────────────
          One row from `lg`: the pitch on the left, the field on the right, both on the full
          1600px rail. Below `lg` it stacks, which is the only shape that works when the field
          alone needs the whole width. */}
      <div className="border-b border-hairline">
        <form
          onSubmit={handleNewsletterSubmit}
          className={`${RAIL} flex flex-col gap-3 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-6`}
        >
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink-1">
              Abonnez-vous
            </h2>
            <p className="mt-1 text-sm text-ink-2">Offres exclusives et nouveautés, une fois par semaine.</p>
          </div>
          {/* ONE ROW AT EVERY WIDTH, including 320. The field and the button stacked cost 52px on
              a phone for no gain: at 390 the button is ~112px and the field keeps ~230, which is
              more than enough for an email — the placeholder is shortened to match rather than the
              layout being grown to fit the placeholder. */}
          <div className="flex w-full min-w-0 gap-2 lg:w-auto lg:shrink-0">
            <Input
              type="email"
              placeholder="Votre email…"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border-hairline bg-sunken text-ink-1 placeholder:text-ink-3 sm:w-72"
              aria-label="Votre adresse email"
              required
            />
            <Button
              type="submit"
              className="h-11 shrink-0 rounded-xl px-4 font-display text-xs font-semibold uppercase tracking-wide sm:px-6 sm:text-sm"
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
        </form>
      </div>

      {/* ── BRAND + FOUR COLUMNS, ONE GRID ─────────────────────────────────────────────────
          Two up on a phone (a footer link is ~120px of text on a 390px screen, so one column
          spent two thirds of every row on nothing), five across from `lg` — the brand block is
          the first of the five rather than a band above them. */}
      <div
        className={`${RAIL} grid grid-cols-2 gap-x-6 gap-y-8 py-8 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] lg:gap-x-8 lg:py-10`}
      >
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <Link href="/" prefetch={false} className="inline-block transition-opacity hover:opacity-80">
            <Image
              src={footerLogoUrl}
              alt="Proteine Tunisie"
              width={230}
              height={75}
              className="h-10 w-auto object-contain sm:h-12"
              sizes="230px"
              loading="lazy"
            />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-2">
            Compléments alimentaires authentiques, sélectionnés et livrés partout en Tunisie.
            Paiement à la livraison, expédition sous 24–72h.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SOCIALS.map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-sunken text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label={label}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        <FooterLinkColumn title="Navigation" links={NAVIGATION} />
        <FooterLinkColumn title="Catégories" links={CATEGORIES} />

        <div className="min-w-0">
          <FooterHeading>Services &amp; ventes</FooterHeading>
          <ul className="mt-3 space-y-0.5">
            {footerPages.map((p) => (
              <li key={p.id}>
                {p.slug ? (
                  <Link href={`/${p.slug}`} prefetch={false} className={FOOTER_LINK}>
                    {p.title}
                  </Link>
                ) : (
                  <span className="flex min-h-[44px] items-center text-sm text-ink-3 sm:min-h-[34px]">
                    {p.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <FooterHeading>Nous contacter</FooterHeading>
          <ul className="mt-3 space-y-0.5">
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
            <li className="flex items-start py-1.5 text-sm text-ink-2">
              <MapPin className="me-2.5 mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 break-words">{contactAddress}</span>
            </li>
          </ul>
          {/* The two controls the deleted "Nous trouver" band existed for, beside the address
              they act on. The map itself is a band below, and only once it is asked for. */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className={QUIET_BUTTON}
              aria-expanded={showMap}
            >
              <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {showMap ? 'Masquer la carte' : 'Afficher la carte'}
            </button>
            <a href={mapsLinkHref} target="_blank" rel="noopener noreferrer" className={QUIET_BUTTON}>
              Itinéraire
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* A Google Maps embed is a third-party iframe that pulls several hundred kilobytes of
          script and runs its own main thread. It renders when — and only when — somebody presses
          for it, so the footer costs nothing for the large majority who never do. */}
      {showMap && (
        <div className="border-t border-hairline">
          <div className={`${RAIL} py-6`}>
            <div
              className="h-56 w-full overflow-hidden rounded-2xl border border-hairline bg-sunken sm:h-72 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
              dangerouslySetInnerHTML={{ __html: mapEmbedHtml }}
            />
          </div>
        </div>
      )}

      {/* ── LEGAL ──────────────────────────────────────────────────────────────────────────
          The registered identity sits here rather than on a page nobody opens: for a cash-on-
          delivery shop, a real RC and matricule fiscal is the cheapest proof that somebody
          answerable is on the other end of the order. */}
      <div className="border-t border-hairline">
        {/*
          ── ONE WRAPPING ROW, AND EVERY <p> CARRIES ITS OWN SIZE ─────────────────────────────
          Written as a stack this measured 212px on a 390px phone — a legal line taller than the
          newsletter — because each of the three parts claimed a full-width row of its own.
          Wrapping lets the © and the button share a line and the identity fall under them only
          when it has to.

          THE SIZE IS ON THE <p>, NOT ON THE CONTAINER, and that is not a style preference.
          globals.css sets `p { font-size: var(--text-base) }` in @layer base, so a paragraph
          NEVER inherits a container's `text-xs` — it renders at 16px, silently, at the same
          specificity the container's utility can't reach past because the utility isn't on the
          element. The previous footer had `text-xs` on this container and two `<p>`s inside it,
          and had been shipping a 16px legal line on every page of the site since it was written.
          Measured: 53px for one sentence that fits on one 18px line.
        */}
        <div
          className={`${RAIL} flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 text-ink-3`}
        >
          {/* The two legal strings are ONE group so they share a line on a desktop rail and wrap
              against each other, not against the button, on a phone. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <p className="min-w-0 text-[11px] leading-relaxed sm:text-xs">
              © {year}{' '}
              <span className="font-display font-semibold uppercase tracking-wide text-brand">
                Proteine Tunisie
              </span>
              . Tous droits réservés.
            </p>
            <span className="hidden h-3 w-px bg-hairline lg:block" aria-hidden="true" />
            <p className="min-w-0 break-words text-[11px] leading-relaxed sm:text-xs">
              {LEGAL_IDENTITY.legalName} · RC {LEGAL_IDENTITY.registreCommerce} · MF{' '}
              {LEGAL_IDENTITY.matriculeFiscal}
            </p>
          </div>
          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={QUIET_BUTTON}
          >
            Haut de page
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">{children}</h2>
  );
}

function FooterLinkColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="min-w-0">
      <FooterHeading>{title}</FooterHeading>
      <ul className="mt-3 space-y-0.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} prefetch={false} className={FOOTER_LINK}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
