'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, Loader2, Youtube } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { subscribeNewsletter, getCmsPages, getCoordinates } from '@/services/api';
import type { Coordinate } from '@/types';
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
  const [pages, setPages] = useState<CmsPage[]>(pagesProp ?? []);
  const [coord, setCoord] = useState<Coordinate | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCoordinates().then(setCoord).catch(() => {});
  }, []);

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

  // Fetch CMS pages when not provided (e.g. when used inside Client Components)
  useEffect(() => {
    if (pagesProp && pagesProp.length > 0) {
      setPages(pagesProp);
      return;
    }
    getCmsPages().then(setPages);
  }, [pagesProp]);

  // Show all API pages in footer
  const footerPages = pages;

  // Lazy load Google Maps only when footer is visible (Intersection Observer).
  // Depend on mapEmbedHtml so the observer attaches once the map element is
  // actually rendered — coord loads async, so on first mount the ref is null.
  useEffect(() => {
    if (!mapEmbedHtml || shouldLoadMap || !mapRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before footer is visible
    );

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapEmbedHtml, shouldLoadMap]);

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

  return (
    <footer id="contact" className="bg-gray-950 text-gray-300 border-t border-gray-800">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-16">
        {/* Mobile: Premium single-column stacked layout (Nike/Gymshark style) */}
        <div className="md:hidden flex flex-col gap-8 pb-6 w-full max-w-full overflow-hidden">
          {/* 1. Logo + tagline - scaled down, premium, no crop */}
          <div className="space-y-4 w-full">
            <div className="flex justify-start">
              <Link href="/" className="block max-w-[220px] opacity-90 hover:opacity-100 transition-opacity duration-300">
                <Image
                  src={footerLogoUrl}
                  alt="Proteine Tunisie"
                  width={220}
                  height={71}
                  className="w-full h-auto object-contain object-left"
                  sizes="(max-width: 480px) 130px, (max-width: 768px) 150px, 170px"
                  loading="lazy"
                />
              </Link>
            </div>
          </div>

          <div className="h-px bg-gray-800/60 w-full" aria-hidden="true" role="separator" />

          {/* 2. Suivez-nous */}
          <div className="space-y-3 w-full">
            <h3 className="font-display text-white text-sm uppercase tracking-wide">Suivez-nous</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <a href="https://facebook.com/proteinetunisie" target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors shrink-0" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/sobitas.proteine.tunisie/" target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors shrink-0" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/sobitas-proteine-tunisie-b63b671a8/" target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors shrink-0" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://www.tiktok.com/@sobitas.proteine.tunisie" target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors shrink-0" aria-label="TikTok">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/@proteine-tunisie" target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors shrink-0" aria-label="YouTube">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="h-px bg-gray-800/60 w-full" aria-hidden="true" role="separator" />

          {/* 3. Abonnez-vous */}
          <div className="space-y-3 w-full">
            <h3 className="font-display text-white text-sm uppercase tracking-wide">Abonnez-vous</h3>
            <p className="text-sm text-gray-400">
              {NEWSLETTER_SUBTITLE}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3 w-full">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Input
                  type="email"
                  placeholder="Entrez votre email..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 min-w-0 bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500 h-11 sm:h-12 rounded-xl text-sm sm:text-base"
                  required
                />
                <Button
                  type="submit"
                  className="h-11 sm:h-12 px-6 font-display uppercase tracking-wide font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shrink-0"
                  disabled={isSubscribing}
                >
                  {isSubscribing ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> ...</>) : "S'abonner"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">En vous abonnant, vous acceptez de recevoir nos offres par email.</p>
            </form>
          </div>

          <div className="h-px bg-gray-800/60 w-full" aria-hidden="true" role="separator" />

          {/* 4. Contact */}
          <div className="space-y-3 w-full">
            <h3 className="font-display text-white text-sm uppercase tracking-wide">Contact</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <a href={contactPhoneHref} className="flex min-h-11 items-center gap-3 py-2 hover:text-red-500 min-w-0" aria-label="Appeler">
                <Phone className="h-5 w-5 text-red-500 shrink-0" />
                <span className="break-words">{contactPhones}</span>
              </a>
              <a href={`mailto:${contactEmail}`} className="flex min-h-11 items-center gap-3 py-2 hover:text-red-500 min-w-0">
                <Mail className="h-5 w-5 text-red-500 shrink-0" />
                <span>{contactEmail}</span>
              </a>
              {contactAddress ? (
                <div className="flex items-start gap-3 py-2 min-w-0">
                  <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="break-words">{contactAddress}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="h-px bg-gray-800/60 w-full" aria-hidden="true" role="separator" />

          {/* 5. Services & Ventes (from API) */}
          <div className="space-y-3 w-full">
            <h3 className="font-display text-white text-sm uppercase tracking-wide">Services & Ventes</h3>
            <ul className="space-y-1.5">
              {footerPages.length > 0 ? footerPages.map((p) => (
                <li key={p.id}>
                  {p.slug ? (
                    <Link href={`/${p.slug}`} className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">{p.title}</Link>
                  ) : (
                    <span className="flex min-h-11 items-center py-2 text-sm text-gray-500">{p.title}</span>
                  )}
                </li>
              )) : null}
            </ul>
          </div>

          <div className="h-px bg-gray-800/60 w-full" aria-hidden="true" role="separator" />

          {/* 6. Navigation */}
          <div className="space-y-3 w-full">
            <h3 className="font-display text-white text-sm uppercase tracking-wide">Navigation</h3>
            <ul className="space-y-1.5">
              <li><Link href="/" className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">Accueil</Link></li>
              <li><Link href="/shop" className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">Nos produits</Link></li>
              <li><Link href="/packs" className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">Packs</Link></li>
              <li><Link href="/blog" className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">Blog</Link></li>
              <li><Link href="/contact" className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">Contact</Link></li>
            </ul>
            <h3 className="font-display text-white text-sm uppercase tracking-wide mt-5">Catégories</h3>
            <ul className="space-y-1.5">
              {[
                ['/whey-proteine', 'Whey protéine'],
                ['/creatine', 'Créatine'],
                ['/gainers-proteines', 'Gainers'],
                ['/prise-de-masse', 'Prise de masse'],
                ['/perte-de-poids', 'Perte de poids'],
                ['/pre-workout', 'Pre-workout'],
                ['/brands', 'Toutes les marques'],
              ].map(([href, label]) => (
                <li key={href}><Link href={href} className="flex min-h-11 items-center py-2 text-sm text-gray-400 hover:text-red-500 active:text-red-500">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Desktop: 4-column layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Contact Info & Social */}
          <div className="space-y-6">
            <div className="relative h-16 w-auto mb-6 shrink-0 flex items-center">
              <Image
                src={footerLogoUrl}
                alt="Proteine Tunisie"
                width={230}
                height={75}
                className="h-16 w-auto object-contain"
                style={{ width: 'auto', height: 'auto' }}
                loading="lazy"
              />
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <a href={contactPhoneHref} className="flex items-center gap-3 text-sm hover:text-red-500 transition-colors" aria-label="Appeler">
                <Phone className="h-5 w-5 text-red-500" aria-hidden="true" />
                <span>{contactPhones}</span>
              </a>
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-sm hover:text-red-500 transition-colors">
                <Mail className="h-5 w-5 text-red-500" />
                <span>{contactEmail}</span>
              </a>
              {contactAddress ? (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{contactAddress}</span>
                </div>
              ) : null}
            </div>

            {/* Social Media */}
            <div>
              <h3 className="font-display uppercase tracking-wide text-white mb-4">Suivez-nous</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://facebook.com/proteinetunisie"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/sobitas.proteine.tunisie/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/sobitas-proteine-tunisie-b63b671a8/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://www.tiktok.com/@sobitas.proteine.tunisie"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@proteine-tunisie"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display uppercase tracking-wide text-white mb-6">Navigation</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm hover:text-red-500 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-sm hover:text-red-500 transition-colors">
                  Nos produits
                </Link>
              </li>
              <li>
                <Link href="/packs" className="text-sm hover:text-red-500 transition-colors">
                  Packs
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm hover:text-red-500 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-red-500 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
            {/* Catégories — real SSR links on every page so category/subcategory landing pages
                receive sitewide internal links (equity distribution + crawl depth). */}
            <h3 className="font-display uppercase tracking-wide text-white mt-8 mb-6">Catégories</h3>
            <ul className="space-y-3">
              {[
                ['/whey-proteine', 'Whey protéine'],
                ['/creatine', 'Créatine'],
                ['/gainers-proteines', 'Gainers'],
                ['/prise-de-masse', 'Prise de masse'],
                ['/perte-de-poids', 'Perte de poids'],
                ['/pre-workout', 'Pre-workout'],
                ['/brands', 'Toutes les marques'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:text-red-500 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Ventes (from API) */}
          <div>
            <h3 className="font-display uppercase tracking-wide text-white mb-6">Services & Ventes</h3>
            <ul className="space-y-3">
              {footerPages.map((p) => (
                <li key={p.id}>
                  {p.slug ? (
                    <Link href={`/${p.slug}`} className="text-sm hover:text-red-500 transition-colors">
                      {p.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500">{p.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-display uppercase tracking-wide text-white text-lg">Abonnez-vous</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                {NEWSLETTER_SUBTITLE}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Votre email..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl"
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 font-display uppercase tracking-wide font-semibold rounded-xl shadow-sm"
                  disabled={isSubscribing}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    'S\'abonner'
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  En vous abonnant, vous acceptez de recevoir nos offres par email
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Map Section - Deferred loading, reduced height on mobile */}
        {mapEmbedHtml ? (
        <div className="mt-8 md:mt-12" ref={mapRef}>
          <h3 className="font-display uppercase tracking-wide text-white text-base md:text-inherit mb-3 md:mb-4">Géolocalisation</h3>
          <div className="rounded-2xl md:rounded-xl overflow-hidden h-48 md:h-64 bg-gray-800 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0">
            {shouldLoadMap ? (
              <div
                className="h-full w-full"
                dangerouslySetInnerHTML={{ __html: mapEmbedHtml }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <MapPin className="h-12 w-12" aria-hidden="true" />
                <span className="sr-only">Carte de localisation</span>
              </div>
            )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Bar - Compact on mobile */}
      <div className="border-t border-gray-800/50 bg-black/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              type="button"
              aria-label="Remonter en haut"
              className="text-center md:text-left text-sm text-gray-400 hover:text-red-500 transition-colors"
              onClick={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              © {new Date().getFullYear()} <span className="text-red-500 font-display uppercase tracking-wide">PROTEINE TUNISIE</span>. Tous droits réservés.
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
