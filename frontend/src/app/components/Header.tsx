'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu, Moon, Sun, Phone, Package, MapPin, Truck } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Button } from '@/app/components/ui/button';
import { useTheme } from 'next-themes';
import { ProductsDropdown } from './ProductsDropdown';
import { CartDrawer } from './CartDrawer';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { cn } from '@/app/components/ui/utils';
import { getStorageUrl } from '@/services/api';

const SCROLL_THRESHOLD = 24;
const PHONE = '+216 27 612 500';
const PHONE_FIXE = '+216 73 200 169';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=35.836372,10.630613';
const DELIVERY_MSG = 'Livraison gratuite à partir de 300 DT';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { getTotalItems, cartDrawerOpen, setCartDrawerOpen } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const cartItemsCount = getTotalItems();

  const onScroll = useCallback(() => {
    const next = window.scrollY > SCROLL_THRESHOLD;
    setScrolled((prev) => (prev !== next ? next : prev));
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = [
    { href: '/', label: 'ACCUEIL' },
    { href: '/shop', label: 'NOS PRODUITS' },
    { href: '/packs', label: 'PACKS' },
    { href: '/brands', label: 'MARQUES' },
    { href: '/blog', label: 'BLOG' },
    { href: '/contact', label: 'CONTACT' },
    { href: '/about', label: 'QUI SOMMES NOUS' },
  ];

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* ========== 1. TOP INFO BAR (Slim, 32-36px) ========== */}
      <div className="bg-gray-900 text-white border-b border-gray-800/50">
        {/* Desktop: full info */}
        <div className="hidden md:flex max-w-7xl mx-auto h-9 px-4 lg:px-8 items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-4">
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0" aria-label={`Appeler ${PHONE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE}</span>
            </a>
            <span className="text-gray-600">|</span>
            <a href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0" aria-label={`Appeler ${PHONE_FIXE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE_FIXE}</span>
            </a>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0"
            aria-label="Notre localisation"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Notre localisation</span>
          </a>
          <span className="flex items-center gap-1.5 shrink-0 text-gray-300">
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {DELIVERY_MSG}
          </span>
        </div>
        {/* Mobile: collapsed single line */}
        <div className="md:hidden flex h-8 px-4 items-center justify-center text-[11px] font-medium text-gray-200">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
          Livraison gratuite dès 300 DT
        </div>
      </div>

      {/* ========== 2. MAIN HEADER ========== */}
      <header
        className={cn(
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm',
          'transition-all duration-300 ease-out'
        )}
      >
        {/* ----- MOBILE: Hamburger | Logo | Search + Cart ----- */}
        <div className="md:hidden">
          <div
            className={cn(
              'flex items-center justify-between w-full px-4 gap-1 transition-all duration-300',
              scrolled ? 'h-12 py-2' : 'h-14 py-2.5'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 rounded-xl -ml-1"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>

            <Link href="/" className="flex items-center justify-center flex-1 min-w-0 max-w-[6.5rem] sm:max-w-[7.5rem]" aria-label="Protein.tn - Accueil">
              <Image
                src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                alt="Protein.tn"
                width={120}
                height={40}
                className="w-full h-auto object-contain drop-shadow-sm transition-all duration-300"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>

            <div className="flex items-center gap-0 flex-shrink-0">
              <SearchBar variant="mobile" className="-mr-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 rounded-xl -mr-1 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} article${cartItemsCount > 1 ? 's' : ''}` : 'Panier'}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ----- DESKTOP: Logo | Search | Account + Theme + Cart ----- */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-24 gap-6 py-4">
            <Link href="/" className="flex-shrink-0" aria-label="Protein.tn - Accueil">
              <Image
                src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                alt="Protein.tn"
                width={180}
                height={56}
                className="w-auto h-12 lg:h-16 object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
                style={{ width: 'auto' }}
                priority
              />
            </Link>

            <div className="flex-1 max-w-xl mx-8 min-w-0">
              <SearchBar variant="desktop" />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0" aria-label="Mon compte">
                      <User className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100] min-w-[200px] shadow-xl" sideOffset={8}>
                    <div className="px-3 py-2.5 border-b">
                      <p className="text-sm font-semibold truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">Mon Compte</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">
                        <Package className="h-4 w-4 mr-2" />
                        Mes Commandes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  className="h-11 px-6 rounded-full font-bold bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all gap-2"
                  asChild
                >
                  <Link href="/login">
                    <User className="h-5 w-5" />
                    <span>Connexion</span>
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Changer le thème"
              >
                {theme === 'dark' ? <Sun className="h-6 w-6 text-yellow-400" /> : <Moon className="h-6 w-6 text-gray-700" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-12 w-12 rounded-full border border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 group"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} articles` : 'Panier'}
              >
                <ShoppingCart className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full border-2 border-white dark:border-gray-900">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* ========== 3. NAVIGATION BAR (Desktop only) ========== */}
          <nav className="flex items-center justify-center gap-5 xl:gap-8 py-3 border-t border-gray-200/50 dark:border-gray-800/50 flex-wrap" aria-label="Navigation principale">
            <Link href="/" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              ACCUEIL
            </Link>
            <ProductsDropdown />
            <Link href="/packs" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              PACKS
            </Link>
            <Link href="/brands" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              MARQUES
            </Link>
            <Link href="/blog" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              BLOG
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              CONTACT
            </Link>
            <Link href="/about" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50">
              QUI SOMMES NOUS
            </Link>
          </nav>
        </div>
      </header>

      {/* ========== MOBILE DRAWER (Phone, Localisation, Nav, Account) ========== */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-[320px] p-0 flex flex-col rounded-r-2xl overflow-hidden"
        >
          <SheetHeader className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Link href="/" onClick={closeMobileMenu} className="block max-w-[120px]">
              <Image
                src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                alt="Protein.tn"
                width={120}
                height={38}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Phone & Localisation (from top bar) */}
            <div className="px-4 pb-4 space-y-2 border-b border-gray-200 dark:border-gray-800">
              <a
                href={`tel:${PHONE.replace(/\s/g, '')}`}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-[15px] font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label={`Appeler ${PHONE}`}
              >
                <Phone className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                {PHONE}
              </a>
              <a
                href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-[15px] font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label={`Appeler ${PHONE_FIXE}`}
              >
                <Phone className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                {PHONE_FIXE}
              </a>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-[15px] font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label="Notre localisation"
              >
                <MapPin className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                Notre localisation
              </a>
              <p className="flex items-center gap-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                <Truck className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
                {DELIVERY_MSG}
              </p>
            </div>

            {/* Navigation */}
            <div className="px-4 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 mb-2">Navigation</h3>
              <nav className="space-y-0.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="block py-3 px-3 text-[15px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors -mx-1"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Account, Cart, Theme */}
            <div className="mt-4 pt-4 px-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl text-[15px] font-medium -mx-1"
                onClick={() => { setCartDrawerOpen(true); closeMobileMenu(); }}
              >
                <ShoppingCart className="h-5 w-5 mr-3 shrink-0" />
                Panier{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
              </Button>
              {isAuthenticated ? (
                <>
                  <Link href="/account" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-[15px] font-medium -mx-1">
                      <User className="h-5 w-5 mr-3 shrink-0" />
                      Mon Compte
                    </Button>
                  </Link>
                  <Link href="/account/orders" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-[15px] font-medium -mx-1">
                      <Package className="h-5 w-5 mr-3 shrink-0" />
                      Mes Commandes
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-[15px] font-medium text-red-600 -mx-1" onClick={() => { logout(); closeMobileMenu(); }}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-[15px] font-medium -mx-1">
                    <User className="h-5 w-5 mr-3 shrink-0" />
                    Connexion
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl text-[15px] font-medium -mx-1"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 mr-3 shrink-0" /> : <Moon className="h-5 w-5 mr-3 shrink-0" />}
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
    </div>
  );
}
