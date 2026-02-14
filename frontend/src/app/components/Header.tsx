'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Menu, Moon, Sun, Phone, Package, MapPin, Truck, Search, X, Loader2, ArrowRight, ChevronRight } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Button } from '@/app/components/ui/button';
import { useTheme } from 'next-themes';
import { ProductsDropdown } from './ProductsDropdown';
import { MobileProductsMenu } from './MobileProductsMenu';
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
import { searchProducts } from '@/services/api';
import { useDebounce } from '@/util/debounce';
import type { Product } from '@/types';

const SCROLL_THRESHOLD = 24;
const MOBILE_NAV_SCROLL_THRESHOLD = 20;   // navbar always visible when scrollY < this
const MOBILE_NAV_SCROLL_DELTA = 12;       // min px change to avoid flicker (scroll direction)
const MOBILE_BREAKPOINT = 768;
const PHONE = '+216 27 612 500';
const PHONE_FIXE = '+216 73 200 169';
const MAPS_URL = 'https://maps.app.goo.gl/w2ytnYAKSZDmjznh6';
const DELIVERY_MSG = 'Livraison gratuite à partir de 300 DT';

export function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsMenuOpen, setMobileProductsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const check = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobileViewport(mobile);
      if (mobile) {
        const y = Math.max(0, window.scrollY);
        lastScrollYRef.current = y;
        setMobileNavVisible(y <= MOBILE_NAV_SCROLL_THRESHOLD);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const { getTotalItems, cartDrawerOpen, setCartDrawerOpen } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const cartItemsCount = getTotalItems();
  
  // Real-time search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Real-time search effect
  useEffect(() => {
    const performSearch = async () => {
      const trimmed = debouncedSearchQuery.trim();
      if (!trimmed) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const { products } = await searchProducts(trimmed);
        setSearchResults(products || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onScroll = useCallback(() => {
    const w = typeof window === 'undefined' ? 0 : window.innerWidth;
    const currentScrollY = Math.max(0, (typeof window === 'undefined' ? 0 : window.scrollY));
    const last = lastScrollYRef.current;

    if (w > MOBILE_BREAKPOINT) {
      setScrolled(currentScrollY > SCROLL_THRESHOLD);
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (currentScrollY <= MOBILE_NAV_SCROLL_THRESHOLD) {
      setMobileNavVisible(true);
    } else if (currentScrollY > last + MOBILE_NAV_SCROLL_DELTA) {
      setMobileNavVisible(false);
    } else if (currentScrollY < last - MOBILE_NAV_SCROLL_DELTA) {
      setMobileNavVisible(true);
    }
    lastScrollYRef.current = currentScrollY;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        onScroll();
        tickingRef.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Ensure only one menu is open at a time
  useEffect(() => {
    if (mobileProductsMenuOpen && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileProductsMenuOpen, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen && mobileProductsMenuOpen) {
      setMobileProductsMenuOpen(false);
    }
  }, [mobileMenuOpen, mobileProductsMenuOpen]);

  const navLinks = [
    { href: '/', label: 'ACCUEIL' },
    { href: '/packs', label: 'PACKS' },
    { href: '/brands', label: 'MARQUES' },
    { href: '/blog', label: 'BLOG' },
    { href: '/contact', label: 'CONTACT' },
    { href: '/about', label: 'QUI SOMMES NOUS' },
  ];

  const mobileNavHidden = isMobileViewport && !mobileNavVisible;

  return (
    <div
      className="sticky top-0 z-50 w-full transition-transform duration-300 ease-out"
      style={
        mobileNavHidden
          ? { transform: 'translateY(-100%)' }
          : undefined
      }
    >
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
            {/* Logo - Left aligned */}
            <Link href="/" className="flex items-center justify-start flex-1 min-w-0 max-w-[8rem] sm:max-w-[9rem] -ml-2" aria-label="Protein.tn - Accueil">
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
                className="relative h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} article${cartItemsCount > 1 ? 's' : ''}` : 'Panier'}
              >
                <ShoppingCart className="h-6 w-6" aria-hidden />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>

              {/* Profile/Connection Icon */}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => router.push('/account')}
                  aria-label="Mon compte"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => router.push('/login')}
                  aria-label="Connexion"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 rounded-xl -mr-1"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        {/* ----- DESKTOP: iHerb-style Header with Red Background ----- */}
        <div className="hidden md:block bg-red-600 dark:bg-red-700">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Logo - Left */}
            <Link href="/" className="flex-shrink-0" aria-label="Protein.tn - Accueil">
              <Image
                src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                alt="Protein.tn"
                  width={200}
                  height={70}
                  className="h-10 lg:h-14 xl:h-16 w-auto object-contain brightness-0 invert"
                priority
              />
            </Link>

              {/* Search Bar - Center (Large) with Real-time Results */}
              <div className="flex-1 max-w-2xl mx-4 min-w-0 relative">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }
                  }}
                  className="relative w-full"
                >
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-600 pointer-events-none z-10" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0 || isSearching) {
                        setShowSearchResults(true);
                      }
                    }}
                    placeholder="Rechercher tous les produits..."
                    className="w-full h-11 pl-4 pr-12 rounded-lg border-0 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </form>

                {/* Search Results Dropdown */}
                {showSearchResults && (searchQuery.trim() || searchResults.length > 0 || isSearching) && (
                  <div
                    ref={searchResultsRef}
                    className="absolute left-0 right-0 top-full mt-2 z-50 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl max-h-[500px] overflow-y-auto"
                  >
                    {isSearching ? (
                      <div className="flex items-center justify-center py-8 text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Recherche en cours...</span>
                      </div>
                    ) : searchQuery.trim() && searchResults.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        <p>Aucun produit trouvé pour &quot;{searchQuery}&quot;</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <div className="max-h-[400px] overflow-y-auto">
                          {searchResults.slice(0, 6).map((product) => (
                            <Link
                              key={product.id}
                              href={`/shop/${product.slug}`}
                              onClick={() => {
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                                {product.cover ? (
                                  <Image
                                    src={getStorageUrl(product.cover)}
                                    alt={product.designation_fr}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gray-200" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {product.designation_fr}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {product.prix} DT
                                  {product.promo != null && product.promo < product.prix && (
                                    <span className="ml-1 text-red-600 dark:text-red-400">
                                      → {product.promo} DT
                                    </span>
                                  )}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            </Link>
                          ))}
                        </div>
                        {searchResults.length > 6 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                            <Link
                              href={`/shop?search=${encodeURIComponent(searchQuery.trim())}`}
                              onClick={() => {
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Voir tous les résultats ({searchResults.length})
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
            </div>

              {/* Right Side: Sign In/Account + Theme + Cart */}
            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Sign In / Account */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-10 px-4 text-white hover:bg-red-700 dark:hover:bg-red-800 gap-2 font-medium"
                        aria-label="Mon compte"
                      >
                        <User className="h-5 w-5" />
                        <span className="hidden lg:inline">{user?.name || 'Mon compte'}</span>
                        <span className="lg:hidden">Compte</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="z-[9999] min-w-[200px] shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 backdrop-blur-sm" 
                    sideOffset={8}
                  >
                    <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate text-gray-600 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Link href="/account">Mon Compte</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Link href="/account/orders">
                        <Package className="h-4 w-4 mr-2" />
                        Mes Commandes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={logout} 
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                    className="h-10 px-4 text-white hover:bg-red-700 dark:hover:bg-red-800 gap-2 font-medium"
                    variant="ghost"
                  asChild
                >
                  <Link href="/login">
                    <User className="h-5 w-5" />
                      <span className="hidden lg:inline">Connexion</span>
                      <span className="lg:hidden">Connexion</span>
                  </Link>
                </Button>
              )}

                {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                  className="h-10 w-10 text-white hover:bg-red-700 dark:hover:bg-red-800 transition-all shrink-0"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Changer le thème"
              >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

                {/* Shopping Cart */}
              <Button
                variant="ghost"
                size="icon"
                  className="relative h-10 w-10 text-white hover:bg-red-700 dark:hover:bg-red-800 transition-all shrink-0"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} articles` : 'Panier'}
              >
                  <ShoppingCart className="h-6 w-6" />
                {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-white text-red-600 text-xs font-bold rounded-full border-2 border-red-600">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>
            </div>
            </div>
          </div>

          </div>

        {/* ========== 3. NAVIGATION BAR (Desktop only) - White Background ========== */}
        <nav className="hidden md:flex items-center justify-center gap-5 xl:gap-8 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-wrap" aria-label="Navigation principale">
          <Link href="/" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              ACCUEIL
            </Link>
            <ProductsDropdown />
          <Link href="/packs" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              PACKS
            </Link>
          <Link href="/brands" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              MARQUES
            </Link>
          <Link href="/blog" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              BLOG
            </Link>
          <Link href="/contact" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              CONTACT
            </Link>
         
          <Link href="/about" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              QUI SOMMES NOUS
            </Link>
          </nav>
      </header>

      {/* ========== MOBILE DRAWER (Phone, Localisation, Nav, Account) ========== */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="w-[85vw] max-w-[320px] p-0 flex flex-col rounded-l-2xl overflow-hidden"
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

          <div className="flex-1 overflow-y-auto py-4 flex flex-col">
            {/* Navigation - Top */}
            <div className="px-4 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 mb-2">Navigation</h3>
              <nav className="space-y-0.5">
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className="block py-3 px-3 text-[15px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors -mx-1"
                >
                  ACCUEIL
                </Link>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    // Small delay to ensure mobile menu closes first
                    setTimeout(() => {
                      setMobileProductsMenuOpen(true);
                    }, 150);
                  }}
                  className="w-full text-left py-3 px-3 text-[15px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors -mx-1 flex items-center justify-between"
                >
                  <span>NOS PRODUITS</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                {navLinks.slice(1).map((link) => (
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
            <div className="mt-auto pt-4 px-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
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

            {/* Phone & Localisation - Bottom */}
            <div className="px-4 pt-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-800 mt-4">
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
          </div>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
      <MobileProductsMenu open={mobileProductsMenuOpen} onOpenChange={setMobileProductsMenuOpen} />
    </div>
  );
}
