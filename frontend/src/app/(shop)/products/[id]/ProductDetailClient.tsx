'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { useCart } from '@/app/contexts/CartContext';
import { Button } from '@/app/components/ui/button';
import { ProductInfoSection } from '@/app/components/product/ProductInfoSection';
import { LoyaltyEarnLine } from '@/app/components/loyalty/LoyaltyEarnLine';
import { REVIEW_POINTS_AWARD, pointsToDt } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';
import { buildProductUrl, buildProductUrlPath } from '@/util/productUrl';
import { ProductRequestDialog } from '@/app/components/ProductRequestDialog';
import { ReviewThread } from '@/app/components/reviews/ReviewThread';
import { MemberLink } from '@/app/components/reviews/MemberLink';
import { ProductIdentifiers } from '@/app/components/product/ProductIdentifiers';
import { ProductGallery } from '@/app/components/product/ProductGallery';
import { ProductLabelGrid } from '@/app/components/product/ProductLabelGrid';
import { ProductHighlights } from '@/app/components/product/ProductHighlights';
import { ProductComparisonTable } from '@/app/components/product/ProductComparisonTable';
import { FrequentlyBoughtTogether } from '@/app/components/product/FrequentlyBoughtTogether';
import { RelatedProductsRail } from '@/app/components/product/RelatedProductsRail';
import { ProductQualityPanel } from '@/app/components/product/ProductQualityPanel';
import { AromaSelect } from '@/app/components/product/AromaSelect';
import { buildWhatsAppHref, WHATSAPP_GREEN, WHATSAPP_ICON_PATH } from '@/util/whatsapp';
import { StarRating } from '@/app/components/product/StarRating';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Minus, Plus, ShoppingCart, Star, Shield, Heart, Share2, ZoomIn, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, X, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Flame, Truck, CreditCard, Mail, BadgeCheck, Phone, ArrowUpDown, ArrowLeft, ArrowUpRight, ShieldCheck, MessageSquare, Coins } from 'lucide-react';
import { useQuickOrder } from '@/contexts/QuickOrderContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { QuickOrderProduct } from '@/contexts/QuickOrderContext';
import type { Product, Review } from '@/types';
import { getStorageUrl, addReview, addGuestReview, getProductDetails } from '@/services/api';
import { hasValidPromo } from '@/util/productPrice';
import { buildComparison } from '@/util/productComparison';
import { splitHighlights } from '@/util/productHighlights';
import { mergeProductContent } from '@/util/productDescriptionSections';
import { embedUrl, videoId, videoTitle } from '@/util/officialVideo';
import { sanitizeRichHtml } from '@/util/sanitizeRichHtml';
import { generateProductFallbackDescription } from '@/util/productDescriptionFallback';
import {
  hasProductSourceContent,
  productSourceAttribution,
  productSourceFactRows,
  productSourceGallery,
  productSourceNutritionHtml,
  productSourceSections,
  splitPackshotsFromLabels,
} from '@/util/productSourceFacts';
import { useAuth } from '@/contexts/AuthContext';
import { notify as toast } from '@/lib/notify';
import {
  getStockDisponible,
  getMaxAddable,
  getProductStockStatus,
} from '@/util/cartStock';
import { cn } from '@/app/components/ui/utils';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

export type BreadcrumbItem = { name: string; url: string };

/** The three orders worth offering. See `sortedReviews` for why there is no "most helpful". */
type ReviewSort = 'recent' | 'best' | 'worst';

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
  /**
   * One product per COMPLEMENTARY shelf — a creatine and a shaker for a whey, not three wheys.
   * Fetched server-side (services/productComplements.ts) and optional: the routes that cannot do
   * a server fetch simply do not send it, and "Complétez votre commande" does not render.
   */
  complementProducts?: Product[];
  /** When rendering under /shop/[slug], pass slug so refetch/links work */
  slugOverride?: string;
  /** Breadcrumb path (Accueil > Category > Product). BreadcrumbList schema is output by the server. */
  breadcrumbItems?: BreadcrumbItem[];
}


export function ProductDetailClient({ product: initialProduct, similarProducts, complementProducts = [], slugOverride, breadcrumbItems = [] }: ProductDetailClientProps) {
  const REVIEW_PAGE_SIZE = 12;
  // Same helper, same columns as CrawlerProductView — content parity is not optional here, because
  // middleware sends Googlebot to that view and a table only one of them can see is a discrepancy.
  const comparisonRows = buildComparison(initialProduct, similarProducts);
  const officialVideoId = videoId(initialProduct.official_video);
  const router = useRouter();
  const params = useParams();
  const productSlug = (slugOverride ?? (params?.slug as string) ?? (params?.id as string)) ?? '';
  const { addToCart, getCartQty } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [requestOpen, setRequestOpen] = useState(false);
  const { isFavorite: isInFavorites, toggleFavorite } = useFavorites();
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  /** Display name for a review written without an account. Unused when signed in. */
  const [guestReviewName, setGuestReviewName] = useState('');
  /*
    ── ANTI-ABUSE, BECAUSE A REVIEW IS NOW WORTH MONEY ────────────────────────────────────────
    A published review credits 50 loyalty points, redeemable at 20 to the dinar. That turns review
    spam from a nuisance into a way to mint currency, so the submission carries two pieces of
    evidence that it came from a person:

      reviewHoneypot   a field no human can see. A script that fills every input it finds fills
                       this one; the server then accepts the submission, stores nothing, and
                       returns the ordinary success message — telling a bot it was caught tells
                       whoever wrote it which field to skip.
      reviewOpenedAt   when the form was opened. `Date.now()` at submit minus this is how long
                       composing took, which the server scales against the text length. Three
                       sentences in 900ms were not typed.

    Neither decides anything alone — see ReviewAuthenticity for how they are weighed.
  */
  const [reviewHoneypot, setReviewHoneypot] = useState('');
  const reviewOpenedAt = useRef<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(12);
  const [reviewSort, setReviewSort] = useState<ReviewSort>('recent');
  const { openQuickOrder } = useQuickOrder();
  /** Selected aroma for display; add to cart / command use this or first aroma. */
  const [selectedAromaId, setSelectedAromaId] = useState<number | null>(null);
  /** Nutrition image lightbox: index of the open image (-1 = closed) */
  const [nutritionLightbox, setNutritionLightbox] = useState<number>(-1);

  // Use state to manage product data so we can update it after adding a review
  const [product, setProduct] = useState<Product>(initialProduct);
  const favoriteProduct = {
    id: product.id,
    designation_fr: product.designation_fr,
    slug: product.slug,
    cover: product.cover,
    prix: product.prix,
    promo: product.promo ?? null,
    rupture: product.rupture,
    // See FavoriteProduct: /favoris recommends from the aisle, and this is where a shopper who
    // hearts from the product page would otherwise save nothing to recommend from.
    sous_categorie_id: (product as any).sous_categorie_id,
    brand_id: (product as any).brand_id,
  };
  // Backend already filters reviews by publier = 1 in the relationship, so use all reviews returned
  // The publier field is hidden in JSON response, so we can't filter on frontend
  const [reviews, setReviews] = useState<Review[]>(initialProduct.reviews || []);

  // Scroll to avis section when URL has #reviews (e.g. after opening shared link)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#reviews') {
      const el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Single source of truth for stock (matches API: rupture true/1 = out of stock, qte <= 0 = out of stock)
  const stockStatus = getProductStockStatus(product as any);
  const stockDisponible = getStockDisponible(product as any);
  const inCartQty = getCartQty(product.id);

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.debug('[ProductDetail] stock', {
      qte: product.qte,
      rupture: product.rupture,
      low_stock_threshold: (product as any).low_stock_threshold,
      stockStatus,
    });
  }

  // Update product and reviews when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct);
    // Backend's reviews() relationship already filters by publier = 1, so all returned reviews are published
    const productReviews = initialProduct.reviews || [];
    setReviews(productReviews);

    // Aroma: auto-select first (display only; add to cart / command use first or selected)
    const aromes = initialProduct.aromes;
    if (aromes && aromes.length > 0) {
      setSelectedAromaId(aromes[0].id);
    } else {
      setSelectedAromaId(null);
    }

  }, [initialProduct]);

  // Clamp quantity to 1..stockDisponible when stock changes
  useEffect(() => {
    setQuantity((q) => {
      const max = Math.max(1, stockDisponible);
      if (q < 1) return 1;
      if (stockDisponible <= 0) return 1;
      return Math.min(max, q);
    });
  }, [stockDisponible]);

  const basePrice = product.prix || 0;
  const hasPromo = hasValidPromo(product);
  const promoPrice = hasPromo && product.promo != null ? product.promo : null;
  const displayPrice = promoPrice ?? basePrice;
  const oldPrice = promoPrice ? basePrice : null;
  const discount = promoPrice != null && basePrice > 0 ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0;
  const rating = product.note || (reviews.length > 0
    ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
    : 0);
  const reviewCount = reviews.length;

  /*
    The WhatsApp message names the product, its reference and its URL — see the CTA for why that
    matters more than the button existing. `useMemo` because the href is a string built from four
    fields and this component re-renders on every quantity tap.

    ── THIS USED TO READ `window.location.href`, AND IT WAS A HYDRATION MISMATCH ──────────────
    `typeof window === 'undefined' ? '' : window.location.href` is the first bullet in React's own
    hydration-mismatch error, and it was firing on EVERY product page on this site: the server
    rendered the href with no URL in it, the client rendered one with, and React's message says
    plainly that a mismatched attribute "won't be patched up".

    So the customer got the SERVER's version — the message with the product link missing — which is
    the one thing the comment above says is the point of the button. A shop that runs on WhatsApp
    orders was sending itself "Bonjour, je suis intéressé(e) par : NITROTECH" with no way to tell
    which listing the person was looking at.

    `buildProductUrl` derives the same canonical URL from props on both sides, so there is nothing
    to mismatch. It is also a better link than `location.href` was: no `?utm_…`, no `#avis`, no
    filter query string — just the product's own address.
  */
  const whatsappHref = useMemo(() => {
    const ref = (product.sku || product.schema?.sku || '').toString().trim();
    const url = buildProductUrl(product);
    return buildWhatsAppHref(
      [
        `Bonjour, je suis intéressé(e) par : ${product.designation_fr || 'ce produit'}`,
        ref ? `Référence : ${ref}` : '',
        url,
        'Est-il disponible ?',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }, [product]);

  /*
    -- THE SORT ------------------------------------------------------------------------------
    Newest-first remains the default, because on a page with a handful of reviews recency is the
    only ordering a reader can verify for themselves.

    "Meilleures notes" and "Notes les plus basses" are both offered, and offering the SECOND one is
    the point. A control that only sorts a page's reviews downward from five stars is a marketing
    device; the reader who wants the worst review first is the reader deciding whether to spend
    150 DT, and hiding that from them is how a shop earns a reputation for hiding things. Both
    orders fall back to date, so a tie never shuffles between renders.

    There is no "most helpful": nothing records helpfulness. The reference storefront prints
    "Helpful (0)" under every review, which after a while reads as "nobody found any of this
    useful" - a control with no data behind it is worse than an absent one.
  */
  const sortedReviews = useMemo(() => {
    const byDate = (a: Review, b: Review) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    };
    const list = [...reviews];
    if (reviewSort === 'best') return list.sort((a, b) => b.stars - a.stars || byDate(a, b));
    if (reviewSort === 'worst') return list.sort((a, b) => a.stars - b.stars || byDate(a, b));
    return list.sort(byDate);
  }, [reviews, reviewSort]);
  const reviewsToShowOnPage = sortedReviews.slice(0, visibleReviewCount);

  /** Filament stores product FAQ as JSON array `{ q, a }[]` on `faq`; exposed as-is from `GET /product_details/{slug}`. */
  const productFaqItems = useMemo(() => {
    const raw = (product as Product & { faq?: unknown }).faq;
    if (!raw) return [] as Array<{ id: number; q: string; a: string }>;
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((item: Record<string, unknown>, idx: number) => ({
        id: idx,
        q: String(item?.q ?? item?.question ?? '').trim(),
        a: String(item?.a ?? item?.answer ?? '').trim(),
      }))
      .filter((item) => item.q.length > 0 || item.a.length > 0);
  }, [product]);

  /*
   * ── THE DESCRIPTION, SPLIT IN TWO ──────────────────────────────────────────────────────────
   * `highlights` is the lead bullet list; `descriptionHtml` is the same description with that list
   * removed so the page never prints it twice. Nothing is written and nothing is dropped — see
   * util/productHighlights.ts, which also explains every case where it declines to split and hands
   * the description back untouched.
   *
   * Measured across 42 imported products in eight categories: 28 yield a panel.
   */
  const descriptionSource =
    product.description_fr || product.description_cover || generateProductFallbackDescription(product);
  const { highlights, rest: descriptionHtml } = useMemo(
    () => splitHighlights(descriptionSource),
    [descriptionSource]
  );

  /*
   * ── ONE COPY OF EACH BLOCK, NOT TWO ────────────────────────────────────────────────────────
   * Owner, 17/08/2026, with the reference storefront beside our page: *"the product page still the
   * same layout"*. He was right, and the reason was in the data rather than the CSS.
   *
   * On the product he screenshotted — NOW Foods Whey Protein Isolate, Creamy Vanilla, 816 g —
   * `description_fr` is 13,746 characters: the entire source page transcribed whole, with its own
   * headings for Aperçu, Spécifications, Poids de l'article, Usage suggéré, Autres ingrédients,
   * Avertissements and a legal notice, plus three tables. All of it inside ONE accordion, open by
   * default, under the word "Description".
   *
   * And two of those blocks were ALSO rendered as their own sections below it, because
   * `source_facts.content.sections` carries them separately — as were all three nutrition tables,
   * which Valeurs nutritionnelles already prints from `nutrition_html`. Roughly 4,500 characters of
   * exact repetition on a single page.
   *
   * `mergeProductContent` routes each block to exactly one place and drops the loser. Measured on
   * that product: the Description body goes 13,746 -> 2,588 characters and nothing is lost, because
   * everything it removed is rendered by a named section instead.
   */
  const merged = useMemo(
    () =>
      mergeProductContent({
        descriptionHtml,
        sourceSections: productSourceSections(product),
        // Valeurs nutritionnelles already has a panel to print, so the description's tables must
        // not become a second one.
        hasCanonicalNutrition:
          productSourceNutritionHtml(product) !== null ||
          (product.nutrition_values != null && String(product.nutrition_values).trim().length > 10),
      }),
    [descriptionHtml, product]
  );

  /*
   * Is there actually anything behind the fold of the Description panel?
   *
   * The `max-h-60` clamp and the "Lire plus" button were written when this panel held the entire
   * source page. Now that the blocks are routed out, most descriptions are shorter than the clamp —
   * so the button revealed nothing, which teaches a reader that the control is decorative, and that
   * lesson carries to the pages where it IS hiding something.
   *
   * ONE flag drives both the clamp and the button, deliberately: they cannot disagree, so there is
   * no state in which content is clipped with no way to open it.
   *
   * 600 characters is a shade more than fills the 240px clamp at the narrowest column this renders
   * in, so the button appears only when at least a line is genuinely hidden.
   */
  const descriptionIsLong = useMemo(
    () => merged.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length > 600,
    [merged]
  );

  /*
   * ── THE STICKY BAR ONLY EXISTS WHEN THE REAL ONE IS GONE ───────────────────────────────────
   * With one render tree the CTAs are in the buy box at every width, which they never were on a
   * phone before — mobile had them ONLY in the sticky bar. Leaving that bar permanently up now
   * means two identical "Ajouter au panier" buttons on screen at the same time, one of them
   * covering the page.
   *
   * So the bar tracks the buy box: out of view, bar up; in view, bar down.
   *
   * It starts HIDDEN and the observer's first callback decides. It started visible, on the
   * reasoning that a phone opens with the buy box below the fold — but on a desktop the buy box is
   * in view at scroll 0, so that default meant the bar painted and then slid away. The measurement
   * caught it as a flapping result (visible at 1440, hidden at 1280, same viewport height, same
   * run); a human sees it as a flash. The observer reports within a frame either way, so the cost
   * of starting hidden is at most one frame on a phone, and the cost of starting visible was a
   * glitch on every desktop load.
   */
  const buyBoxRef = useRef<HTMLDivElement | null>(null);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);

  /*
   * ── THIS PAGE OWNS THE BOTTOM OF A PHONE SCREEN ────────────────────────────────────────────
   * Measured on live production at 390px, the day the redesign shipped: the PWA install banner
   * occupied 707-788 and the sticky CTA occupied 711-788. Same band, same z-index (both
   * `z-sticky-cta`, both anchored `bottom-tabbar`), so which one a customer saw came down to DOM
   * order — and on a product page the answer was "Installer l'application" painted over "Ajouter
   * au panier".
   *
   * That is the single highest-intent control on the site, on 81% of its traffic, covered by a
   * prompt to install an app.
   *
   * The flag is one-way and mirrors what InstallAppBanner ALREADY does with `data-install-banner`
   * so the WhatsApp button can lift out of its way. No shared state, no import between the two,
   * and any future page with a bottom-anchored CTA gets the same protection by setting the same
   * attribute.
   *
   * `data-has-sticky-cta` on <body> and `data-sticky-cta` on the bar are deliberately DIFFERENT
   * names. They were the same for one revision, and `querySelector('[data-sticky-cta]')` then
   * matched <body> first and measured a 5,989px-tall "CTA bar". Two different questions — "does
   * this page have one" and "which element is it" — need two different attributes.
   */
  useEffect(() => {
    document.body.setAttribute('data-has-sticky-cta', '');
    /* `data-page` drives the ONE rule in globals.css that unsticks the site header on this
       template — see the block there for why the header does not decide this for itself. */
    document.body.setAttribute('data-page', 'product');
    return () => {
      document.body.removeAttribute('data-has-sticky-cta');
      document.body.removeAttribute('data-page');
    };
  }, []);

  useEffect(() => {
    const node = buyBoxRef.current;
    // No observer, no way to know — so show it permanently. The primary CTA is the one thing on
    // this page that must never be the casualty of a missing browser API.
    if (!node || typeof IntersectionObserver === 'undefined') {
      setStickyBarVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setStickyBarVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const imageAltBase = (product.seo?.image_alt || product.alt_cover || product.designation_fr || 'Produit').trim();
  /*
   * ── THE IMPORTED PHOTOGRAPHY, WHICH THIS PAGE HELD AND NEVER SHOWED ─────────────────────────
   *
   * Owner, 16/08/2026: *"I accept to publish all the photos."*
   *
   * 6,437 products carry 23,293 photographs between them, and this page was rendering ONE. The
   * reason is visible in the line this replaces: the array was built from `product.cover` plus
   * `product.images` — a legacy column that is `null` on every imported product — so the source
   * gallery was simply never read. Measured on the live API for
   * `rainbow-light-gummy-vitamin-c-slices…`: `images: null`, and
   * `source_facts.content.gallery: 3 images`. Two of the three were being discarded.
   *
   * NOTHING ELSE HERE HAD TO CHANGE, and that is the point. The thumbnail strip, the swipe
   * handlers, the selected-index clamp and the keyboard controls below were all written for a
   * multi-image gallery and have been running against an array of length 1 since they shipped.
   * `galleryImages.length > 1` guards the strip, so it has never once rendered.
   *
   * COVER FIRST, ALWAYS. It is the photograph the shop chose, and on an imported product it is
   * also `gallery[0]` — which is exactly why the `Set` is load-bearing rather than defensive:
   * without it the primary image would appear twice in the strip.
   *
   * The crawler route (`CrawlerProductView`) has rendered this same gallery all along, so until
   * now Googlebot could see every photograph and a customer could not.
   */
  const galleryImagePaths = useMemo(() => {
    const extra = Array.isArray((product as any).images) ? (product as any).images : [];
    const sourceGallery = productSourceGallery(product as Parameters<typeof productSourceGallery>[0]);
    const paths = [product.cover, ...extra, ...sourceGallery]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    return [...new Set(paths)];
  }, [product]);
  const galleryImages = useMemo(() => {
    return galleryImagePaths
      .map((path) => getStorageUrl(path))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }, [galleryImagePaths]);
  /*
   * ── PACKSHOTS IN THE CAROUSEL, LABEL SHOTS IN A GRID ──────────────────────────────────────
   * Owner, 17/08/2026: *"always the first 2 are the front and the back of the products and the rest
   * are instructions … I want the instructions to be shown in the page as a grid of images."*
   *
   * On the product he screenshotted, eight photographs were stacked as eight thumbnails under the
   * main image — so the Supplement Facts panel and the directions, shot close enough to read, were
   * filed as if they were alternate angles of the tub. Six swipes deep, on the most trustworthy
   * content on the page: the manufacturer's own printed words rather than our transcription of
   * them. See splitPackshotsFromLabels for why the rule only applies above two.
   */
  const { packshots, labels: labelImages } = useMemo(
    () => splitPackshotsFromLabels(galleryImages),
    [galleryImages]
  );

  /*
   * The cover, for the CART and the quick-order sheet — not for the gallery.
   *
   * `ProductGallery` owns which photograph is on screen, so this is deliberately index 0 rather
   * than "whatever the customer last tapped": a basket line and an order confirmation should show
   * the product's canonical photograph, not the third angle someone happened to leave open.
   */
  const productImage = galleryImages[0] || '';

  useEffect(() => {
    setVisibleReviewCount(REVIEW_PAGE_SIZE);
  }, [reviews.length, REVIEW_PAGE_SIZE]);

  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    
    // Decode HTML entities (including French characters)
    let decoded = html
      // French characters
      .replace(/&eacute;/g, 'é')
      .replace(/&Eacute;/g, 'É')
      .replace(/&egrave;/g, 'è')
      .replace(/&Egrave;/g, 'È')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&Ecirc;/g, 'Ê')
      .replace(/&agrave;/g, 'à')
      .replace(/&Agrave;/g, 'À')
      .replace(/&acirc;/g, 'â')
      .replace(/&Acirc;/g, 'Â')
      .replace(/&icirc;/g, 'î')
      .replace(/&Icirc;/g, 'Î')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&Ocirc;/g, 'Ô')
      .replace(/&ucirc;/g, 'û')
      .replace(/&Ucirc;/g, 'Û')
      .replace(/&uuml;/g, 'ü')
      .replace(/&Uuml;/g, 'Ü')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&Ccedil;/g, 'Ç')
    // Quotes and apostrophes
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
      // Common entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Numeric entities (common ones)
      .replace(/&#233;/g, 'é')
      .replace(/&#232;/g, 'è')
      .replace(/&#234;/g, 'ê')
      .replace(/&#224;/g, 'à')
      .replace(/&#226;/g, 'â')
      .replace(/&#238;/g, 'î')
      .replace(/&#244;/g, 'ô')
      .replace(/&#251;/g, 'û')
      .replace(/&#231;/g, 'ç');
    
    // Decode numeric entities using browser API if available (client-side only)
    if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        decoded = textarea.value;
      } catch (e) {
        // Keep the manually decoded version if browser API fails
      }
    }
    
    // Remove HTML tags
    const withoutTags = decoded.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    return withoutTags
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get meta description for display (strip HTML if needed)
  const metaDescription = product.meta_description_fr 
    ? stripHtml(product.meta_description_fr)
    : product.description_cover 
    ? stripHtml(product.description_cover)
    : null;

  const quickOrderProduct: QuickOrderProduct = {
    id: product.id,
    designation_fr: product.designation_fr ?? '',
    slug: product.slug,
    cover: product.cover,
    prix: product.prix ?? 0,
    promo: product.promo ?? undefined,
    promo_expiration_date: product.promo_expiration_date ?? undefined,
    rupture: product.rupture,
    aromes: product.aromes,
  };

  /** Effective aroma for cart/quick order: selected or first (never block add/command). */
  const effectiveAromaId = selectedAromaId ?? product.aromes?.[0]?.id;

  /** Cart logic. "Commander maintenant" uses shared Quick Order modal. */
  const handleAddToCart = () => {
    if (stockStatus.isOutOfStock || stockDisponible <= 0) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }
    const requestedTotal = inCartQty + quantity;
    if (requestedTotal > stockDisponible) {
      const restant = getMaxAddable(stockDisponible, inCartQty);
      toast.error(
        `Stock insuffisant. Il reste ${restant} unité${restant !== 1 ? 's' : ''}.`
      );
      if (restant > 0) setQuantity(restant);
      return;
    }

    const selectedAroma = product.aromes?.find(a => a.id === effectiveAromaId);
    const cartProduct = {
      ...product,
      name: product.designation_fr,
      price: displayPrice,
      priceText: `${displayPrice} DT`,
      image: productImage,
      ...(selectedAroma && { selectedAroma: { id: selectedAroma.id, designation_fr: selectedAroma.designation_fr } }),
    };
    addToCart(cartProduct as any, quantity);
    toast.success('Produit ajouté au panier');
  };

  /*
   * Add several products in one press, for "Complétez votre commande".
   *
   * Deliberately NOT a loop over `handleAddToCart`: that one is about THIS product and carries its
   * quantity, its selected flavour and its stock guard. A companion is added as one unit of itself,
   * and the only shared requirement is that the cart line looks the same however it was created —
   * hence the same field mapping rather than the same function.
   */
  const handleAddManyToCart = (chosen: Product[]) => {
    const added = chosen.filter((entry) => getStockDisponible(entry as any) > 0);
    if (added.length === 0) {
      toast.error('Ces produits ne sont plus disponibles');
      return;
    }
    added.forEach((entry) => {
      const price = hasValidPromo(entry) && entry.promo != null ? entry.promo : entry.prix || 0;
      addToCart(
        {
          ...entry,
          name: entry.designation_fr,
          price,
          priceText: `${price} DT`,
          image: getStorageUrl(entry.cover || ''),
        } as any,
        1
      );
    });
    toast.success(`${added.length} produits ajoutés au panier`);
  };

  const handleQuickOrderClick = () => {
    openQuickOrder(quickOrderProduct, { initialQty: quantity, initialVariantId: effectiveAromaId ?? undefined });
  };

  /**
   * ── A VISITOR WITH NO ACCOUNT CAN NOW WRITE ONE (owner, 21/08/2026) ───────────────────────
   * *"make a system for anonymous reviews without an account."*
   *
   * This used to bounce straight to /login, which is the single most effective way to not collect
   * a review: somebody who has just formed an opinion is asked to create an account first, and
   * they leave. Now the same form submits down one of two paths.
   *
   * The two paths are NOT interchangeable and the difference is deliberate:
   *
   *   signed in   `/add_review` — attaches a delivered order when one matches the email, which is
   *               what makes the review attested and therefore able to move the star rating.
   *   guest       `/reviews/guest` — always held for moderation, and never written with `verified`
   *               or `commande_id`, so it is readable on the page and INVISIBLE to the rating and
   *               to the JSON-LD. That is what makes accepting it safe.
   *
   * So a guest review is a real review that costs the shop nothing if it turns out to be noise.
   */
  /* Stamped when the form OPENS, not on mount: the page can sit unread for ten minutes before
     somebody presses "Écrire un avis", and counting that as composition time would make every
     review look laboriously hand-written — the opposite of the signal being measured. */
  useEffect(() => {
    if (showReviewForm && reviewOpenedAt.current === null) {
      reviewOpenedAt.current = Date.now();
    }
    if (!showReviewForm) {
      reviewOpenedAt.current = null;
    }
  }, [showReviewForm]);

  const composeMs = () => (reviewOpenedAt.current ? Math.max(0, Date.now() - reviewOpenedAt.current) : 0);

  const handleSubmitReview = async () => {
    if (reviewStars === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    if (!isAuthenticated) {
      // The guest endpoint requires both, and failing here with a specific message beats a 422
      // rendered as "Envoi impossible". The comment minimum is the backend's own (10 characters):
      // a star with no words is not a review anybody can read, and it is what a bot submits.
      if (guestReviewName.trim().length < 2) {
        toast.error('Indiquez un nom à afficher avec votre avis.');
        return;
      }
      if (reviewComment.trim().length < 10) {
        toast.error('Écrivez quelques mots sur le produit (10 caractères minimum).');
        return;
      }

      setIsSubmittingReview(true);
      try {
        const res = await addGuestReview({
          product_id: product.id,
          stars: reviewStars,
          comment: reviewComment.trim(),
          author_name: guestReviewName.trim(),
          compose_ms: composeMs(),
          hp_field: reviewHoneypot,
        });
        setReviewStars(0);
        setReviewComment('');
        setGuestReviewName('');
        setShowReviewForm(false);
        // No optimistic insert. A guest review is ALWAYS held, so showing it in the list would be
        // the UI asserting something false about a row that is not published — and the next
        // refetch would silently delete it from under the author.
        toast.success(res.message || 'Merci ! Votre avis sera publié après vérification.');
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(
          message ||
            (status === 429
              ? 'Vous avez déjà envoyé plusieurs avis. Réessayez plus tard.'
              : 'Envoi impossible pour le moment.')
        );
      } finally {
        setIsSubmittingReview(false);
      }
      return;
    }

    setIsSubmittingReview(true);

    try {
      // Submit review to backend
      const newReview = await addReview({
        product_id: product.id,
        stars: reviewStars,
        comment: reviewComment,
        compose_ms: composeMs(),
        hp_field: reviewHoneypot,
      });

      // Backend logic: reviews with stars >= 4 are automatically published (publier = 1)
      // Reviews with stars < 4 are not published (publier = 0) and need moderation
      const isPublished = reviewStars >= 4;

      // Reset form immediately for better UX
      setReviewStars(0);
      setReviewComment('');
      setShowReviewForm(false);

      if (isPublished) {
        // Optimistically add the review to UI immediately (will be replaced by server data)
        if (user) {
          const optimisticReview: Review = {
            id: Date.now(), // Temporary ID
            stars: reviewStars,
            comment: reviewComment || undefined,
            publier: 1,
            created_at: new Date().toISOString(),
            user: {
              id: user.id,
              name: user.name || 'Vous',
              avatar: user.avatar,
            },
          };
          setReviews(prev => [...prev, optimisticReview]);
        }

        // For published reviews, refetch product data to get the complete review with user info
        // Add a small delay to ensure backend transaction is committed
        setTimeout(async () => {
          try {
            // Use the slug from URL params for reliable refetching
            const slugToUse = productSlug || product.slug || product.id.toString();

            // Refetch with cache busting to ensure fresh data
            const updatedProduct = await getProductDetails(slugToUse, true);

            // Update product state with fresh data from backend
            setProduct(updatedProduct);

            // Backend's reviews() relationship already filters by publier = 1
            const publishedReviews = updatedProduct.reviews || [];
            setReviews(publishedReviews);

            const newReviewCount = publishedReviews.length;
            const oldReviewCount = reviews.length;

            if (newReviewCount > oldReviewCount) {
              toast.success(`Avis publié avec succès ! (${newReviewCount} avis)`);
            } else if (newReviewCount === oldReviewCount && newReviewCount > 0) {
              // Review count stayed same but we have reviews - might be a timing issue
              toast.success('Avis ajouté avec succès !');
              // Force a full page refresh to ensure consistency
              setTimeout(() => {
                router.refresh();
              }, 1000);
            } else {
              toast.success('Avis ajouté avec succès !');
              // If count didn't increase, force a full page refresh
              router.refresh();
            }
          } catch (fetchError: any) {
            console.error('Error refetching product:', fetchError);
            // If refetch fails, use router.refresh() as fallback to reload server component
            toast.success('Avis ajouté avec succès !');
            setTimeout(() => {
              router.refresh();
            }, 1000);
          }
        }, 1000); // Wait 1 second for backend to commit transaction and propagate
      } else {
        // Review not published (stars < 4) - will be moderated
        toast.success('Avis ajouté avec succès ! Il sera publié après modération.');
        // Still refresh to ensure UI is in sync
        setTimeout(() => {
          router.refresh();
        }, 500);
      }

    } catch (error: any) {
      console.error('Error adding review:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'ajout de l\'avis';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = () => {
    const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname + window.location.search : '';
    const shareUrl = base.replace(/#.*$/, '') + '#reviews';
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: product.designation_fr,
        text: product.description_fr || '',
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl).then(() => {
        toast.success('Lien copié (vers la section Avis)');
      }).catch(() => {
        toast.error('Impossible de copier le lien');
      });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">

      {/*
        ── `max-w-site`, NOT `max-w-7xl` ─────────────────────────────────────────────────────
        Owner, 17/08/2026, with the reference storefront beside our page: *"why using not the full
        width and getting benefits of it like impact do"*.

        This was not a taste difference, it was this page disagreeing with the rest of the site.
        `max-w-site` is 1600px and tailwind.config.ts states the rule in as many words — *"every
        full-width band on the site — header, hero, category rail, every product section, footer —
        must use `max-w-site`, because if two of them disagree their edges visibly step in and out
        down the page"*. The header above and the footer below are both on it. The product page,
        the single most-visited template on the site, was on `max-w-7xl`: 1280.

        So on the owner's own 1920 screen the header ran to 1600 and the product it framed stopped
        at 1280 — a 160px step in on each side, which is exactly the defect that comment was written
        about. Measured: the gallery goes 687 -> 880px and the buy column 496 -> 620px.
      */}
      <main className="mx-auto w-full max-w-site px-4 py-3 pb-6 sm:px-6 sm:py-6 sm:pb-8 lg:px-8 lg:pb-12 lg:pt-8">
        {/*
          ── THE TRAIL, AND A WAY BACK ────────────────────────────────────────────────────────
          Owner, 17/08/2026: *"for the url track make it to the left and in a good designed way"*.

          It was a bare grey line of 12px text floating above the content with nothing under it —
          left-aligned already, so the note is really about it having no design at all. Two things
          changed and both are structural rather than decorative:

          A RULE UNDER IT, bled to the rail edges. That single hairline is what turns a stray line
          of small text into the page's top bar: it gives the trail a field of its own and it gives
          the gallery below a starting edge. Nothing else on this page needed to move for it.

          A WAY BACK, first, in brand colour. The reference storefront leads with "← Back to
          Products", and it is the more useful control: a shopper who has decided this is not the
          product wants the LIST, and every crumb before it points at a different level of the
          taxonomy. It targets the parent crumb — the sub-category this product sits in — so it is
          always the page they actually came from.

          The trail keeps its single scrollable line on phones: flex-wrap gave two or three stacked
          rows on a long product name, which cost more vertical space above the fold than the whole
          control is worth.
        */}
        {/*
          ── THE BAR HAD PADDING ON ONE SIDE ONLY ─────────────────────────────────────────────
          Owner, 17/08/2026, arrow drawn at the trail: *"not centred … make it center on desktop
          and on mobile"*.

          Read as a horizontal note it makes no sense — the trail is left-aligned because the owner
          asked for it left-aligned a day earlier. It is a VERTICAL note, and it was exactly right.
          This band had `pb-3` and no top padding of its own, so its only top spacing was whatever
          `main` happened to have: 12px on a phone, 32px on a desktop. The text therefore sat 32px
          below the header rule and 12px above its own — pushed hard against the bottom of a band
          two and a half times taller than it looked.

          `-mt-*` cancels main's top padding and `py-*` puts it back symmetrically, so the band is
          its own object: equal air above and below the text at every width, and its top edge flush
          against the header's bottom rule instead of floating 32px under it. The desktop page also
          loses 20px it was spending on half of an accidental gap.
        */}
        {breadcrumbItems.length > 0 && (
          <nav
            aria-label="Fil d'Ariane"
            className="-mx-4 -mt-3 mb-0 border-b border-hairline px-4 py-2.5 text-xs text-ink-3 sm:-mx-6 sm:-mt-6 sm:mb-5 sm:px-6 sm:py-3 sm:text-sm lg:-mx-8 lg:-mt-8 lg:px-8"
          >
            <ol className="flex flex-nowrap items-center gap-x-1.5 overflow-x-auto scrollbar-hide">
              {breadcrumbItems.length > 1 && (
                <li className="flex shrink-0 items-center gap-x-1.5">
                  <Link
                    href={breadcrumbItems[breadcrumbItems.length - 2].url}
                    className="-my-2 inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap py-2 font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    Retour
                  </Link>
                  <span className="h-4 w-px shrink-0 bg-hairline" aria-hidden />
                </li>
              )}
              {breadcrumbItems.map((item, i) => (
                <li key={i} className="flex shrink-0 items-center gap-x-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-3 shrink-0" aria-hidden />}
                  {i < breadcrumbItems.length - 1 ? (
                    <Link href={item.url} className="whitespace-nowrap hover:text-red-600 dark:hover:text-red-400 underline-offset-2 hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="max-w-[46vw] truncate whitespace-nowrap font-medium text-ink-1 sm:max-w-none" aria-current="page">{item.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {/*
          ── ONE HERO, NOT TWO ───────────────────────────────────────────────────────────────
          This grid used to contain a complete `hidden lg:block` tree and a complete `lg:hidden`
          tree: two galleries, two title elements, two rating rows, two price blocks, two of every
          badge. ~580 lines to render one product.

          It was not a stylistic choice, it was accumulated cost, and it had already produced real
          defects. The rating row was corrected on desktop and missed on mobile, so phones showed
          "(0) · 0 avis" for weeks. Each gallery carried a hand-written `1px` entry in its `sizes`
          string purely to stop the browser preloading the OTHER breakpoint's hidden image at
          fetchPriority=high — a workaround for a problem that only existed because there were two.
          And `<ProductIdentifiers>` had to be called twice, four days ago, for the same reason.

          One tree. The layout difference between a phone and a desktop is a grid change, which is
          what CSS grid is for. Every fix from here lands on both by construction.

          ── THE PROPORTIONS: 6 AND 6, MEASURED AGAINST THE REFERENCE ───────────────────────
          The gallery went 5 -> 7 of 12 when the owner said the photographs were too small to read
          the pack labels. That was the right direction and it overshot.

          Measured on the reference storefront at 1920: its gallery column (thumbnail rail plus
          photograph) is 830px of an 1867px content rail — 44% — and its buy column is 900px, 48%.
          Ours was 876 / 612: 57% and 40%. That single number explains most of what the owner means
          by *"impact's page [is] more structured, more clean, feels easy to read"*. A buy column
          150px narrower than the reference's has to wrap where theirs does not, and a gallery
          column 46px wider than its own photograph needs pushes everything below it down the page.

          Six and six. The gallery loses 132px it was not using and the buy column gains 132px it
          was wrapping for. The photograph does NOT shrink to match, because it is capped against
          the viewport height instead — see ProductGallery, which explains why that is the change
          that actually made it bigger for most readers rather than smaller.
        */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:gap-6 lg:mb-12 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-12">

          {/* ── A) GALLERY ─────────────────────────────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-6 lg:row-start-1">
            <ProductGallery
              images={packshots}
              altBase={imageAltBase}
              imageTitle={product.description_cover || product.designation_fr || 'Produit'}
              overlayTopLeft={
                <>
                  {discount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide tabular-nums text-on-brand">
                      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      -{discount}%
                    </span>
                  )}
                  {product.new_product === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide text-ink-1">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                      Nouveau
                    </span>
                  )}
                  {product.best_seller === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide text-ink-1">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                      Top vendu
                    </span>
                  )}
                </>
              }
              /*
                -- THE "+N PHOTOS" TILE ----------------------------------------------------
                The last tile in the thumbnail rail, on the products that have label close-ups.

                Those photographs are NOT in the carousel - `splitPackshotsFromLabels` keeps the
                front and back of the pack there and routes the rest to a grid further down the
                page, because a customer swiping for the product does not want to swipe through six
                shots of the Supplement Facts panel to reach the back of the tub.

                The cost of that split is discoverability: nothing at the top of the page said the
                other six existed. This tile says it, and it is an ordinary anchor into the
                full-width band below — no script, no scroll handler, and it still works with
                JavaScript off, which is the state Googlebot renders a first pass in.
              */
              railTrailing={
                labelImages.length > 0 ? (
                  <a
                    href="#pdp-label-photos"
                    className="flex aspect-square w-16 shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-sunken text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-[4.5rem] lg:w-full"
                  >
                    <span className="font-display text-sm font-bold leading-none tabular-nums">
                      +{labelImages.length}
                    </span>
                    <span className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-wide">
                      photos
                    </span>
                  </a>
                ) : null
              }
            />

          </div>

          {/* ── B) THE BUY COLUMN ──────────────────────────────────────────────────────────── */}
          {/* `lg:row-span-2` is what lets the sections sit under the gallery while this stays
              beside them. `items-start` on the grid keeps it at its natural height inside that
              two-row area rather than stretching the buy box down the page. */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-stretch">

            {/* 1. Where you are. A link, so the crumb also does work for crawl depth. */}
            {product.sous_categorie?.slug && (
              <Link
                href={`/${product.sous_categorie.slug}`}
                // `-my-3 min-h-[44px]`: this is a flex item, so it is blockified and WCAG 2.5.5's
                // inline-text exemption does not apply — it was an 18px-tall target. The negative
                // margin gives it a 44px hit area without giving the column 26px of dead air.
                className="-my-3 inline-flex min-h-[44px] items-center gap-2 self-start font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand underline-offset-4 hover:underline"
              >
                <span className="h-px w-4 bg-brand" aria-hidden="true" />
                {product.sous_categorie.designation_fr}
              </Link>
            )}

            {/* 2. ONE h1. The old mobile tree rendered the name as a <p> specifically to avoid a
                   second h1 in the document; with one tree that workaround is unnecessary. */}
            <h1 className="font-display text-[1.75rem] font-bold uppercase leading-[0.98] tracking-tight text-ink-1 sm:text-[2rem] xl:text-[2.25rem]">
              {product.designation_fr}
            </h1>

            {/*
              ── 3. THE MAKER, AND THE GUARANTEE ─────────────────────────────────────────────
              Owner, 17/08/2026: *"the produit authentique tag, make it more good and clean and
              visible, and the link to the official producer make it visible also"*.

              Both were there and neither read as anything. The brand was `text-sm text-ink-2` with
              a hover underline — indistinguishable from a caption until the pointer was already on
              it, and invisible entirely on a touch screen, which is 81% of this traffic. The
              guarantee was an 11px pill in the third ink.

              They are two chips of equal weight now, because they are two halves of the same
              statement: WHO MADE THIS and WHAT WE PROMISE ABOUT IT. The maker's chip is a real
              affordance — a labelled field, the name at the weight of a name, and an arrow that
              says it goes somewhere — and it earns an internal link from every product page into
              the brand pages, which are pages this site is trying to rank.
            */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                {product.brand?.designation_fr && (
                  <Link
                    href={`/${nameToSlug(product.brand.designation_fr)}`}
                    className="group inline-flex min-h-[44px] min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-hairline bg-elevated px-2 py-1.5 transition-colors hover:border-brand sm:flex-none sm:gap-2 sm:px-3"
                  >
                    <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-ink-3">
                      Marque
                    </span>
                    <span className="truncate text-[11px] font-bold leading-none text-ink-1 transition-colors group-hover:text-brand sm:text-sm">
                      {product.brand.designation_fr}
                    </span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-brand sm:h-4 sm:w-4"
                      aria-hidden="true"
                    />
                  </Link>
                )}

                {/*
                  The shop's OWN guarantee, stated as the shop. Not a third-party verification badge
                  and not a rating: importing either would be a claim we cannot substantiate on a page
                  Google reads.
                */}
                <span className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-sunken px-2 py-1.5 sm:flex-none sm:gap-2 sm:px-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-ok sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden="true" />
                  <span className="whitespace-nowrap text-xs font-semibold leading-none text-ink-1 sm:text-sm">100% authentique</span>
                </span>
              </div>

              {/*
                ZERO REVIEWS MUST NOT LOOK LIKE A ZERO SCORE.

                This renders nothing at all when there are none, rather than five grey stars beside
                "(0) · 0 avis" — a filled-in scoreboard reading nil, which says "nobody liked this"
                when the truth is "nobody has said anything yet". The ask for a review belongs in
                the reviews section, which has an honest empty state. Hide it here, ask for it there.
              */}
              {reviewCount > 0 && (
                <button
                  type="button"
                  onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group inline-flex min-h-[44px] w-full items-center justify-start gap-1.5 rounded-xl border border-hairline bg-sunken px-3 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0"
                >
                  <StarRating rating={rating} size="md" />
                  <span className="text-sm font-medium tabular-nums text-ink-2 transition-colors group-hover:text-brand">
                    {rating.toFixed(1)} · {reviewCount} avis
                  </span>
                </button>
              )}
            </div>

            {/*
              4. THE BENEFITS PANEL — the reference storefront's signature element, and the reason
                 the owner sent the screenshot. When a product has no extractable list this falls
                 back to the meta description; the two are never both shown, because the meta
                 description of an imported product usually restates the H1 and would read as the
                 page saying the same thing twice.
            */}
            {highlights.length > 0 ? (
              <ProductHighlights highlights={highlights} />
            ) : metaDescription ? (
              <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">
                {metaDescription}
              </p>
            ) : null}

            {/*
              ── 5. THE BUY BOX, WHICH FOLLOWS YOU DOWN THE PAGE ────────────────────────────
              Owner, 17/08/2026: *"get benefits of the white spaces"*.

              MEASURED at 1920x900 before changing anything: the buy column ends 810px down and the
              information column beside it runs to 2,057px. That is a THOUSAND pixels of empty
              canvas in the right half of the page, on the template that matters most, while the
              reader is scrolling through specifications with no price and no button anywhere on
              screen.

              `lg:sticky` spends it. The price, the stock line, the quantity and the CTAs travel
              beside the description, the ingredients, the warnings and the traceability panel —
              which is the whole stretch of the page where somebody is deciding.

              ── WHY IT IS SAFE HERE AND WAS NOT BEFORE ──────────────────────────────────────
              This was considered and rejected a session ago, for a real reason: a sticky element
              TALLER than the viewport pins its top and its bottom becomes permanently unreachable,
              so the CTA would be off-screen forever on a short laptop. Two things changed.

              The header is no longer sticky on this template, so the offset is 16px rather than
              130. And the whole column is not what sticks — only the buy box and the tags below it,
              measured at 536px and 579px on the two products the page guard drives, against 752px
              of usable height on a 1366x768 laptop.

              `lg:max-h` + `overflow-y-auto` is the backstop for the product this was not measured
              on: a buy box with six flavour chips that outgrows a short viewport scrolls inside
              itself instead of hiding its own button. It costs nothing when it does not fire.

              `lg:self-stretch` on the column above is what gives this room to travel — with the
              grid's `items-start` the column is only as tall as its content and sticky has nothing
              to stick within.

              The ref is read by the IntersectionObserver that raises and lowers the phone's sticky
              bar. That still works: the box now leaves the viewport when the whole information
              column has passed, which is exactly when a bar is worth showing.
            */}
            {/*
              `lg:flex-1` is not decoration, it is what makes the panel BELOW this block safe.

              A sticky element travels inside its containing block and overlaps whatever follows it
              in flow, so putting the traceability panel after the buy box in the same parent would
              have the price card slide over it on the way down. Wrapping the sticky box in its own
              `flex-1` region ends its travel exactly where that region ends: it still crosses the
              ~1,000px the information column occupies, and it stops before the panel.
            */}
            <div className="lg:flex-1">
              <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <div ref={buyBoxRef} data-buy-box="" className="rounded-2xl border border-hairline bg-elevated p-4 shadow-card sm:p-5">

              {/* Price. One number, at a size nothing else on the page competes with. */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums text-brand sm:text-[2.5rem]">
                  {displayPrice} DT
                </span>
                {oldPrice && (
                  <>
                    <span className="font-display text-lg tracking-tight tabular-nums text-ink-3 line-through">
                      {oldPrice} DT
                    </span>
                    <span className="rounded-full bg-brand px-2 py-0.5 font-display text-xs font-bold tabular-nums text-on-brand">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              {oldPrice && (
                <p className="mt-1.5 text-xs font-semibold tabular-nums text-ok">
                  Vous économisez {(oldPrice - displayPrice).toFixed(2)} DT
                </p>
              )}

              {/*
                ── THE LOYALTY LINE, DIRECTLY UNDER THE PRICE ────────────────────────────────
                This shop has run a 5% points programme the whole time and had never said so on a
                product page. The figure lived behind a login, in the third tab of `/account` —
                visible only to somebody who had already bought and already knew.

                It goes here, between the price and the buy controls, because that is the span of
                page where the number is still being weighed. `displayPrice * quantity` rather
                than the unit price, so raising the stepper raises the reward in the same gesture
                that raises the cost — the same pairing the "Total" line below the stepper makes.
              */}
              <LoyaltyEarnLine amountDt={displayPrice * quantity} className="mt-3" />

              {/* Reference and barcode, where a buyer looks for them. One call site now, not two. */}
              <ProductIdentifiers product={product} className="mt-2.5" />

              {/*
                Stock, next to the control it qualifies rather than floated as a badge beside the
                price. Icon AND text AND colour: "en stock" green against "rupture" red is invisible
                to a red-green deficiency, and this is the line that decides whether the button
                below is worth pressing.
              */}
              {(() => {
                const StockIcon = stockStatus.isOutOfStock
                  ? XCircle
                  : stockStatus.isLowStock
                    ? AlertTriangle
                    : CheckCircle2;
                return (
                  <p
                    className={cn(
                      'mt-3 flex items-center gap-1.5 border-t border-hairline pt-3 text-sm font-semibold',
                      stockStatus.isOutOfStock ? 'text-ink-3' : stockStatus.isLowStock ? 'text-warn' : 'text-ok'
                    )}
                  >
                    <StockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {stockStatus.stockLabel}
                    {stockStatus.isLowStock && stockStatus.qte > 0 && (
                      <span className="font-normal tabular-nums text-ink-3">— plus que {stockStatus.qte}</span>
                    )}
                  </p>
                );
              })()}

              {/* Arômes */}
              {product.aromes && product.aromes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-ink-1">Arôme</p>
                  <AromaSelect
                    aromas={product.aromes}
                    selectedId={selectedAromaId}
                    onChange={setSelectedAromaId}
                  />
                </div>
              )}

              {/* Quantity + running total */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-ink-1">Quantité</span>
                  <div className="flex items-center rounded-xl border border-hairline bg-canvas">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-9 text-center font-display font-bold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={() => setQuantity(Math.min(stockDisponible, quantity + 1))}
                      disabled={quantity >= stockDisponible || stockDisponible <= 0}
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <span className="text-sm text-ink-2 tabular-nums">
                  Total{' '}
                  <span className="font-display font-bold text-ink-1">{(displayPrice * quantity).toFixed(2)} DT</span>
                </span>
              </div>

              {/*
                ── THE CTAs, ON EVERY WIDTH ──────────────────────────────────────────────────
                They used to be desktop-only here; a phone got them ONLY from the sticky bar, so
                the one moment a mobile customer has decided — reading the price, having just set a
                quantity — there was no button under their thumb. That is 81% of this site's
                traffic. The sticky bar stays, and now yields while this box is on screen.
              */}
              <div className="mt-4 flex flex-col gap-2">
                {stockStatus.isBackOrder ? (
                  /*
                    SUR COMMANDE — a request, not a purchase.

                    10,535 of 10,669 published products are catalogue entries the shop does not
                    physically hold. Two disabled "Rupture de stock" buttons is both discouraging
                    and inaccurate: these never sold out, they were never stocked, and they CAN be
                    brought in. The owner's decision was request-only, so this must not be a basket
                    — an add-to-cart here would generate real orders for goods nobody has.
                  */
                  <>
                    <Button
                      type="button"
                      onClick={() => setRequestOpen(true)}
                      className="min-h-[52px] w-full font-display text-sm font-bold uppercase tracking-wide"
                    >
                      <Mail className="me-2 h-4 w-4 shrink-0" />
                      Demander ce produit
                    </Button>
                {/*
                  ── ORDER ON WHATSAPP ─────────────────────────────────────────────────────
                  Owner, 17/08/2026: *"like impact did for us, make the add to cart and buy now,
                  and make another button buy from whatsapp"*.

                  This is not a third CTA for the sake of symmetry with the reference. WhatsApp is
                  the dominant ordering and trust channel for Tunisian cash-on-delivery shoppers —
                  it is already in the header strip and as a floating bubble — and it is the ONLY
                  route that works for the 10,535 of 10,669 products the shop does not physically
                  hold, where the honest answer to "can I have this" is a conversation.

                  The message is PRE-FILLED WITH THE PRODUCT, its reference and its URL. A message
                  that says only "Bonjour" starts the conversation with the shop asking which of
                  11,263 products this is about, and that round trip is where these orders die.

                  Green as an ICON against ink-coloured text, never as a fill under white type:
                  #25D366 measures 3.06:1 on the light sheet, which is legal for a glyph and not
                  for a label. See util/whatsapp.ts, which owns the number, the message and the
                  colour so the three surfaces cannot drift.
                */}
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-elevated font-display text-sm font-bold uppercase tracking-wide text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill={WHATSAPP_GREEN} aria-hidden="true">
                    <path d={WHATSAPP_ICON_PATH} />
                  </svg>
                  Commander sur WhatsApp
                </a>
                    <p className="text-center text-xs text-ink-3">
                      Ce produit n&apos;est pas en stock. Nous le commandons pour vous sur demande — nous vous
                      confirmons le prix et le délai avant toute commande.
                    </p>
                  </>
                ) : (
                  <>
                    {/* ── A PRESS THAT LOOKS LIKE A PRESS ──────────────────────────────────
                        The two CTAs answered a tap with a background-colour change alone, which on
                        a phone is invisible under the thumb that caused it. `active:scale-[0.99]`
                        is 0.5px of travel on a 52px button — below the threshold where it reads as
                        an animation and above the one where it reads as nothing.

                        Named properties rather than `transition-all`, and `motion-reduce` opts out
                        entirely: a scale is movement, and DESIGN_SYSTEM §9 is explicit that
                        anything moving more than a colour respects the preference. */}
                    <Button
                      className="min-h-[52px] w-full font-display text-sm font-bold uppercase tracking-wide transition-[background-color,transform] duration-150 active:scale-[0.99] disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
                      onClick={handleAddToCart}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <ShoppingCart className="me-2 h-4 w-4 shrink-0" />
                      {stockStatus.isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[52px] w-full border-brand bg-transparent font-display text-sm font-bold uppercase tracking-wide text-brand transition-[background-color,color,transform] duration-150 hover:bg-brand hover:text-on-brand active:scale-[0.99] disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
                      onClick={handleQuickOrderClick}
                      disabled={stockStatus.isOutOfStock}
                    >
                      <Zap className="me-2 h-4 w-4 shrink-0" />
                      Commander maintenant
                    </Button>
                {/*
                  ── ORDER ON WHATSAPP ─────────────────────────────────────────────────────
                  Owner, 17/08/2026: *"like impact did for us, make the add to cart and buy now,
                  and make another button buy from whatsapp"*.

                  This is not a third CTA for the sake of symmetry with the reference. WhatsApp is
                  the dominant ordering and trust channel for Tunisian cash-on-delivery shoppers —
                  it is already in the header strip and as a floating bubble — and it is the ONLY
                  route that works for the 10,535 of 10,669 products the shop does not physically
                  hold, where the honest answer to "can I have this" is a conversation.

                  The message is PRE-FILLED WITH THE PRODUCT, its reference and its URL. A message
                  that says only "Bonjour" starts the conversation with the shop asking which of
                  11,263 products this is about, and that round trip is where these orders die.

                  Green as an ICON against ink-coloured text, never as a fill under white type:
                  #25D366 measures 3.06:1 on the light sheet, which is legal for a glyph and not
                  for a label. See util/whatsapp.ts, which owns the number, the message and the
                  colour so the three surfaces cannot drift.
                */}
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-elevated font-display text-sm font-bold uppercase tracking-wide text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill={WHATSAPP_GREEN} aria-hidden="true">
                    <path d={WHATSAPP_ICON_PATH} />
                  </svg>
                  Commander sur WhatsApp
                </a>
                  </>
                )}
              </div>

              {/*
                -- FAVOURITE AND SHARE, WITH THEIR NAMES ON THEM -------------------------------
                These were two unlabelled circles floating on the top-right corner of the
                photograph. That placement is a common one and it is measurably the weaker one
                here: an icon-only control with no text is only as discoverable as the icon is
                obvious, and a heart painted over a product shot competes with the product shot -
                which is the element the owner specifically asked to make bigger.

                The reference storefront puts both under the buy buttons, as labelled pills, and
                that is where a shopper who has decided NOT to buy today actually looks. They are
                written once, here; the copies on the frame are deleted rather than kept in sync.
              */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite(favoriteProduct)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-hairline px-3 text-sm font-medium text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  aria-pressed={isInFavorites(product.id)}
                >
                  <Heart
                    className={cn('h-4 w-4 shrink-0', isInFavorites(product.id) && 'fill-brand text-brand')}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {isInFavorites(product.id) ? 'Dans vos favoris' : 'Ajouter aux favoris'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-hairline px-3 text-sm font-medium text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Partager
                </button>
              </div>

              {/*
                -- THE TRUST ROW: FOUR, AND THE FOURTH IS PRESSABLE ----------------------------
                Three static icons became four, in the reference's two-line shape - but the change
                that matters is that "Conseil" is a `tel:` link and not a picture of a promise.

                81% of this site's traffic is mobile and 10,535 of 10,669 products are sur commande,
                which means the single most common thing a visitor here needs is to ASK someone
                whether a product can be got and when. A phone number they can press is the highest
                intent element on the page after the CTA itself, and it was on the page precisely
                nowhere between the header strip and the footer.

                Each claim is one the shop can keep: the delivery window and cash-on-delivery are
                the shop's stated terms, authenticity is its own guarantee (stated as its own, not
                as a third-party verification), and the number is the number.
              */}
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-hairline pt-4 sm:grid-cols-4">
                {[
                  { Icon: Truck, label: 'Livraison', sub: '24–72h' },
                  { Icon: CreditCard, label: 'Paiement', sub: 'À la livraison' },
                  { Icon: Shield, label: 'Authenticité', sub: '100% garantie' },
                  { Icon: Phone, label: 'Conseil', sub: '27 612 500', href: 'tel:+21627612500' },
                ].map(({ Icon, label, sub, href }) => {
                  const body = (
                    <>
                      <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
                      <span className="text-[11px] font-semibold leading-tight text-ink-1">{label}</span>
                      <span className="text-[10px] leading-tight text-ink-3">{sub}</span>
                    </>
                  );
                  const shell = 'flex flex-col items-center gap-0.5 text-center';
                  return href ? (
                    <a
                      key={label}
                      href={href}
                      className={cn(
                        shell,
                        'min-h-[44px] justify-center rounded-lg transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
                      )}
                    >
                      {body}
                    </a>
                  ) : (
                    <div key={label} className={shell}>
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. Tags — de-emphasised, below the buy box, and they earn internal links. */}
            {(product.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                {product.tags?.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/shop?search=${encodeURIComponent(tag.designation_fr)}&sort=relevance`}
                    className="inline-flex items-center rounded-full border border-hairline px-2.5 py-1 transition-colors hover:border-brand hover:text-brand"
                  >
                    #{tag.designation_fr.toLowerCase()}
                  </Link>
                ))}
              </div>
            )}
              </div>
            </div>

            {/*
              -- CONTROLE & TRACABILITE ------------------------------------------------------
              Owner, 17/08/2026: *"for us add also the quality controle!"*, pointing at the
              reference storefront's laboratory panel.

              This is deliberately NOT that panel. The reference publishes an accredited lab's
              report — MULTILAB, a TUNAC accreditation number, per-assay verdicts, a measured
              protein content against the declared one. We hold no such record for this product or
              for any of the other 10,668, and drawing that panel with invented content would be a
              fabricated safety certificate: a lie to a customer, disprovable by a competitor in
              one click, and the class of thing that costs a site its rankings outright rather
              than a position or two.

              So it states only what the shop can stand behind and the reader can check for
              themselves — the EAN-13, the manufacturer, the photographs of the printed label, and
              where the nutrition figures came from. The component carries the extension point for
              real analyses if the owner commissions them.

              Directly under the specification sections, which is where the reference puts it: it
              is the last thing read before the decision moves back to the buy box.
            */}
            <ProductQualityPanel
              className="mt-6"
              gtin={product.gtin || product.schema?.gtin || null}
              brandName={product.brand?.designation_fr || null}
              brandHref={product.brand?.designation_fr ? `/${nameToSlug(product.brand.designation_fr)}` : null}
              labelPhotoCount={labelImages.length}
              hasTranscribedNutrition={productSourceNutritionHtml(product) != null}
            />
          </div>

          {/* ── C) THE INFORMATION SECTIONS ──────────────────────────────────────────────────
            Under the gallery on a desktop, under the BUY BOX on a phone — and it is a third grid
            item with explicit placement rather than a child of the gallery column, which is the
            only way to have both.

            ── WHY IT MOVED, AND WHAT IT COST ─────────────────────────────────────────────
            These sections were nested inside the gallery column, because on a desktop that is
            exactly where they belong: they start ~700px higher than a full-width block would,
            they are the width of the gallery rather than the width of the page (so a line of
            body text is ~75 characters instead of ~150), and the buy box stays beside them
            while they are read.

            But a phone has one column, and DOM order is the only order it has. Nesting put the
            whole accordion stack BETWEEN the photograph and the H1. MEASURED at 390px, on the two
            products the page guard drives: the product NAME sat 1,169px down the page on a short
            product and 1,621px on a fully transcribed one, and the PRICE at 1,643px and 1,937px,
            behind four to seven collapsed sections. Those are the two facts a shopper came for, on
            the 81% of this site's traffic that is mobile. They now sit at 555/635px and
            1,029/951px — the price arrives 614px earlier on the short product, 986px on the long
            one, and the page is the same height either way.

            Explicit grid placement gives both. The DOM says gallery → buy box → sections, which
            is the phone's order and the right one. From `lg`, `row-start` and `col-start` put the
            sections back under the gallery and give the buy column both rows, so the desktop
            layout is pixel-identical to what it was — verified by the page guard, which measures
            the gallery, the price size and the band order at 1280 and 1440.
          */}
          <div className="mt-8 min-w-0 lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:mt-2">
          {(() => {
            const hasNutritionContent = product.nutrition_values != null &&
              String(product.nutrition_values).trim() !== '' &&
              String(product.nutrition_values).trim() !== '<p></p>' &&
              String(product.nutrition_values).trim() !== '<p><br></p>';
            const hasLegacyQuestionsHtml =
              product.questions != null &&
              String(product.questions).trim() !== '' &&
              String(product.questions).trim() !== '<p></p>' &&
              String(product.questions).trim() !== '<p><br></p>';
            const hasProductFaq = productFaqItems.length > 0;
            const hasQuestionsTab = hasLegacyQuestionsHtml || hasProductFaq;

            return (
              /*
               * ── SEVEN NAMED SECTIONS, NOT TWO TABS ────────────────────────────────────
               *
               * Owner, 16/08/2026, holding a reference storefront beside this page: *"a lot of
               * informations in description that being showed wrong … user can see ingredients
               * clearly, description clearly and any labels clearly."*
               *
               * There were TWO tabs. "Description" carried the marketing overview, the packaging
               * specs, the directions, the other-ingredients list and the warnings — five
               * different kinds of information stacked in one scrolling column with <h3>s as the
               * only separation. A customer asking "how do I take this" read a marketing
               * paragraph first; a customer checking an allergen hunted for a list below both.
               *
               * The data was always structured — `productSourceSections` returns keyed blocks
               * (overview, suggested_use, other_ingredients, warnings) and has since the import
               * shipped. Only the presentation flattened them back into prose. Each block is now
               * its own labelled, collapsible section, in the order the reference uses.
               *
               * TABS ARE GONE RATHER THAN RESTYLED, and that is a correctness change as much as
               * a design one: an inactive Radix tab is ABSENT from the DOM. That cost this page a
               * live structured-data violation one day ago — FAQPage markup emitted for questions
               * that were not in the HTML. `ProductInfoSection` is a native <details>, so its
               * content is in the document whether it is open or shut.
               */
              /*
                ── FULL BLEED ON A PHONE ────────────────────────────────────────────────────
                Owner, 17/08/2026: *"get benefit of the full screen of the mobile, no need for
                extra whitespaces"*.

                MEASURED at 390px: the first character of body text started 33px from the left
                edge — 16px of the page's own gutter plus 17px of this card's padding, and the
                same again on the right. 66px of a 390px screen, 17%, spent on a double inset that
                exists only because a card is sitting inside a padded page.

                `-mx-4` cancels the page gutter and the card keeps its own, so text starts at 16px
                and the reading measure grows by 32px per line. The radius and the side borders go
                with it: a rounded card pinned to both screen edges reads as a mistake, while a
                full-bleed band separated by hairlines is the standard phone pattern. Both come
                back at `sm`, where the page is wide enough for a card to look like one.
              */
              /*
          ── ONE RULE BETWEEN TWO BANDS, NOT TWO ──────────────────────────────────────────────
          Owner, 17/08/2026: *"on mobile why double separators between the sections! read the
          separators and don't do double separators that make a big white space that no needed"*.

          Below `sm` this page is a stack of full-bleed bands — the trail, the packshot, the
          traceability panel, the specification accordion — and every one of them was drawn with
          `border-y`. Two adjacent bands therefore put TWO hairlines on the screen with the layout
          gap trapped between them, which reads as a thick empty seam rather than as a division.

          The rule below `sm` is now: a band draws its BOTTOM edge only, and the band above it
          supplies the top. `sm:border` puts all four sides back the moment these become cards with
          margins, where a full outline is what a card is.
        */
              <div className="-mx-4 divide-y divide-hairline border-b border-hairline bg-elevated px-4 shadow-sm sm:mx-0 sm:w-full sm:rounded-2xl sm:border sm:px-6">

                <ProductInfoSection id="pdp-description" title={product.zone1 || 'Description'} defaultOpen>
                  <div>
                  {/*
                    Transcribed specifications — the format printed on the packaging and the
                    flavour variant, for products imported from the external catalogue.

                    Rendered from the SAME function as /x-crawler/product/[slug], which is the
                    only view Googlebot is served: a fact shown here and missing there is
                    invisible to Google, and a fact shown there and missing here is cloaking.
                    Placed above the description because it is above the description on that route
                    too — parity is about the content, and keeping the order the same is what
                    makes it checkable by reading the two files.

                    It renders NOTHING when product.source_facts is null, which is the permanent
                    state of all 309 hand-made products: no wrapper, no heading, no empty row, so
                    their description tab is byte-identical to what it was.
                  */}
                  {(() => {
                    const sourceFacts = productSourceFactRows(product);
                    if (sourceFacts.length === 0) return null;
                    return (
                      <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                        {sourceFacts.map((row) => (
                          <div key={row.key} className="contents">
                            <dt className="font-medium text-ink-1">{row.label}</dt>
                            <dd className="text-ink-2">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    );
                  })()}
                  <div
                    className={`pdp-prose overflow-hidden transition-[max-height] duration-300 ${!descriptionIsLong || descExpanded ? 'max-h-[5000px]' : 'pdp-clamped max-h-60'}`}
                    // Sanitised, not raw. These CMS fields carry their own <h1> tags, which rendered as extra
                    // top-level headings on the page whose only h1 should be the product name —
                    // up to thirteen on one product. sanitizeProductHtml demotes them to <h2>.
                    // The crawler view already ran this; the page a customer sees did not.
                    // `merged.body`, not `description_fr`. Two things have been taken out of it and
                    // put somewhere better rather than removed: the lead bullet list is the
                    // benefits panel in the hero (util/productHighlights.ts), and every block with
                    // a named slot is its own section below (util/productDescriptionSections.ts).
                    // What is left is what "Description" should have meant all along — what the
                    // product is, what is in the pack, what it weighs.
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(merged.body) }}
                  />
                  {descriptionIsLong && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    // min-h-[44px] and a negative inline margin: the label was a 57x20 hit area,
                    // and this is the control that reveals the rest of the description.
                    className="-mx-2 mt-2 inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-brand hover:underline"
                  >
                    {descExpanded ? 'Voir moins' : 'Lire plus'}
                  </button>
                  )}
                  {/*
                    The transcribed source page — the manufacturer's suggested use, ingredient list
                    and warnings, then the photographs the source page listed, then one sentence
                    about where all of it came from.

                    Same blocks, same headings, same order as /x-crawler/product/[slug], from the
                    same functions. That route is the only one Googlebot is served: a block here
                    and not there is invisible to Google, and a block there and not here is
                    cloaking. Keeping the order identical is what makes the parity checkable by
                    reading the two files side by side.

                    The manufacturer's OVERVIEW is deliberately not among them — promotion folded
                    it into `description_fr`, which is the block rendered immediately above.

                    Every one of these is empty for all 309 hand-made products (no staging row, so
                    `source_facts.content` is null), which is why the whole thing is an IIFE that
                    returns null rather than a wrapper with nothing in it: their description tab
                    renders exactly what it rendered before.
                  */}
                  {/*
                    The provenance sentence stays with the description, because it is a statement
                    about where THESE words came from. The blocks it used to introduce are now
                    siblings of this section rather than children of it — see below.
                  */}
                  {/*
                    -- THE SOURCE'S OWN DISCLAIMER IS NO LONGER RENDERED --------------------
                    It used to be printed here, collapsed, under the heading "Clause de
                    non-responsabilité". It is gone for two reasons and the second is the real one.

                    It NAMES THE SOURCE RETAILER, four times, in French, on our page. Owner,
                    17/08/2026: *"for the texts in the products take off any iherb word"*.

                    And it is redundant. The notice says two things — the printed label governs if
                    it disagrees with this page, and the French is machine-translated — and the
                    attribution line immediately below says both, in the shop's own voice. Keeping
                    both meant 2,510 characters of a competitor's legal boilerplate, duplicated
                    across 21,273 product pages, saying what our own sentence already said.

                    `merged.disclaimer` is still COMPUTED, and that matters: the router uses that
                    block to lift the three nutrition tables out of it. On a transcribed product
                    the tables trail the last heading of the source page, which is this one. Route
                    it, mine it, do not print it. See util/sourceBoilerplate.ts.
                  */}
                  {hasProductSourceContent(product) && productSourceAttribution(product) && (
                    <p className="mt-4 border-t border-hairline pt-3 text-xs text-ink-3">
                      {productSourceAttribution(product)}
                    </p>
                  )}
                  </div>
                </ProductInfoSection>

                {/*
                  ── EACH TRANSCRIBED BLOCK IS ITS OWN SECTION NOW ─────────────────────────────
                  `productSourceSections` has always returned KEYED blocks — suggested_use,
                  other_ingredients, warnings — and this page flattened them back into one column
                  of <h3>s inside Description. That is the "informations showed wrong" the owner
                  pointed at: five kinds of information behind one label.

                  ORDER IS DELIBERATE and matches both the reference storefront and
                  /x-crawler/product/[slug]: directions, then ingredients, then warnings. Parity
                  with the crawler route is not cosmetic — a block shown here and missing there is
                  invisible to Google, and a block there and missing here is cloaking. The order
                  staying identical is what keeps that checkable by reading the two files.

                  SOURCE OF EACH BLOCK: `source_facts.content.sections` when the backend
                  transcribed it, otherwise the matching heading inside `description_fr`. Never
                  both — see mergeProductContent. That is what stopped this product printing its
                  ingredient list and its warnings twice.

                  Nothing renders for a product with neither, which is the permanent state of all
                  309 hand-made ones: no empty section, no bare heading.
                */}
                {merged.sections.map((section) => {
                  const html = sanitizeRichHtml(section.html);
                  if (!html) return null;
                  return (
                    <ProductInfoSection
                      key={section.key}
                      id={`pdp-${section.key}`}
                      title={section.heading}
                    >
                      <div
                        className="pdp-prose"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </ProductInfoSection>
                  );
                })}

                {/* ── `forceMount`, AND THE STYLING ALREADY ASSUMED IT ─────────────────────
                    Radix renders `present && children`, so without this prop an INACTIVE tab is
                    not in the DOM at all. This panel holds the transcribed Supplement Facts —
                    18,965 rows carry one — and the questions panel below holds the FAQ.

                    Two consequences, and the second is the serious one:
                      · the richest content on the page was absent from the server-rendered HTML
                        of the canonical human URL until a human clicked a tab
                      · FAQPage JSON-LD is emitted UNCONDITIONALLY at
                        app/(shop)/[slug]/[productSlug]/page.tsx:338, so the markup asserted
                        questions and answers that were not on the page. Google's FAQPage rules
                        require the content to be present; markup describing invisible content is
                        the exact shape of a structured-data violation.

                    The `data-[state=inactive]:hidden` classes on this element were already
                    written for mounted-but-hidden content and could never fire without the prop —
                    the styling anticipated the fix and the prop was missing. */}
                {/* `forceMount` is no longer needed and no longer possible: <details> keeps its
                    content in the DOM by construction, which is the property that fix was buying. */}
                <ProductInfoSection id="pdp-nutrition" title={product.zone3 || 'Valeurs nutritionnelles'}>
                  {(() => {
                    const nutritionImages = Array.isArray((product as any).nutrition_images)
                      ? ((product as any).nutrition_images as string[]).filter(Boolean)
                      : [];
                    const hasNutritionImages = nutritionImages.length > 0;
                    /*
                     * The transcribed Supplement Facts panel.
                     *
                     * Sanitised here rather than at the point of use so the empty-state test below
                     * asks about the string that will actually render: a panel that sanitises down
                     * to nothing must count as no panel, or the tab would suppress its "not
                     * available" message and then render nothing at all.
                     *
                     * Null for every product with no staging row — all 309 legacy products — so
                     * this whole tab is unchanged for them. The provenance sentence is rendered
                     * once per page, by the description tab, and is deliberately not read here.
                     */
                    /*
                     * `|| merged.nutritionFallback` is the last resort, and it can only ever fire
                     * when there IS no canonical panel — mergeProductContent returns an empty
                     * string otherwise, precisely so this can never become a second copy of the
                     * panel above.
                     *
                     * It matters because the tables trail the last heading of a transcribed page,
                     * so on a product with no `nutrition_html` they were sitting inside whatever
                     * block happened to be last. On the screenshotted product that was the legal
                     * disclaimer.
                     */
                    const sourceNutritionHtml = sanitizeRichHtml(
                      productSourceNutritionHtml(product) || merged.nutritionFallback || ''
                    );
                    return (
                      <div className="p-3 sm:p-5 lg:p-6 pt-4 sm:pt-6 border-t border-hairline">
                        <h2 className="font-display uppercase tracking-tight text-lg sm:text-xl font-bold mb-4 text-ink-1">
                          {product.zone3 || 'Valeurs Nutritionnelles'}
                        </h2>

                        {/* Nutrition Images Gallery */}
                        {hasNutritionImages && (
                          <div className="mb-6">
                            {nutritionImages.length === 1 ? (
                              <button
                                type="button"
                                onClick={() => setNutritionLightbox(0)}
                                className="relative group block w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-hairline shadow-sm hover:shadow-md transition-shadow duration-200 cursor-zoom-in"
                                aria-label="Agrandir l'image nutritionnelle"
                              >
                                <Image
                                  src={getStorageUrl(nutritionImages[0])}
                                  alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles`}
                                  width={600}
                                  height={400}
                                  className="w-full h-auto object-contain"
                                  quality={90}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" size={32} />
                                </div>
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {nutritionImages.map((imgPath, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setNutritionLightbox(idx)}
                                    className="relative group aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-zoom-in bg-gray-50 dark:bg-gray-800"
                                    aria-label={`Image nutritionnelle ${idx + 1}`}
                                  >
                                    <Image
                                      src={getStorageUrl(imgPath)}
                                      alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles ${idx + 1}`}
                                      fill
                                      sizes="(max-width: 640px) 50vw, 33vw"
                                      className="object-contain p-1"
                                      quality={90}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                                      <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" size={20} />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nutrition Text Content */}
                        {hasNutritionContent ? (
                          <div className="w-full min-w-0 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <div
                              className="nutrition-content pdp-prose min-w-[280px]"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.nutrition_values || '') }}
                            />
                          </div>
                        ) : null}

                        {/*
                          The Supplement Facts panel transcribed from the source product page.

                          Rendered AFTER `nutrition_values`, which is the column an admin fills in
                          by hand from the physical label of the lot we hold: a panel read off that
                          label is evidence about the product in our warehouse, and this one is a
                          transcription of a retailer's rendering of the manufacturer's panel. In
                          practice they never both exist — promotion writes no `nutrition_values`,
                          and no legacy product has a staging row.

                          Same panel, same position relative to `nutrition_values`, as
                          /x-crawler/product/[slug]. Null for all 309 legacy products, so their
                          nutrition tab is unchanged.
                        */}
                        {sourceNutritionHtml && (
                          <div className="w-full min-w-0 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <div
                              className="nutrition-content pdp-prose min-w-[280px]"
                              dangerouslySetInnerHTML={{ __html: sourceNutritionHtml }}
                            />
                            {/*
                              The provenance sentence is NOT repeated here.

                              It used to render in both places, so the ordinary supplement — prose
                              sections AND a Supplement Facts panel, which is what the fixtures
                              produce — printed "Informations transcrites de la fiche d'origine du
                              fabricant…" twice on one page while /x-crawler/product/[slug] printed
                              it once. One page, one sentence, wherever the transcribed content
                              starts: the description tab block above renders it, and it opens
                              whenever this row publishes anything at all.
                            */}
                          </div>
                        )}

                        {/*
                          "Not available" now has to account for the transcribed panel as well —
                          otherwise a product that ships a full Supplement Facts table would print
                          a sentence, directly above it, saying it has none.
                        */}
                        {!hasNutritionContent && !hasNutritionImages && !sourceNutritionHtml && (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-ink-3 text-sm sm:text-base">
                              Les valeurs nutritionnelles ne sont pas disponibles pour ce produit.
                            </p>
                          </div>
                        )}

                        {/* Lightbox */}
                        {nutritionLightbox >= 0 && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                            onClick={() => setNutritionLightbox(-1)}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Visionneuse d'image nutritionnelle"
                          >
                            <button
                              type="button"
                              onClick={() => setNutritionLightbox(-1)}
                              className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                              aria-label="Fermer"
                            >
                              <X size={22} />
                            </button>

                            {nutritionImages.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setNutritionLightbox((nutritionLightbox - 1 + nutritionImages.length) % nutritionImages.length); }}
                                  className="absolute left-3 sm:left-6 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                                  aria-label="Image précédente"
                                >
                                  <ChevronLeft size={26} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setNutritionLightbox((nutritionLightbox + 1) % nutritionImages.length); }}
                                  className="absolute right-3 sm:right-6 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
                                  aria-label="Image suivante"
                                >
                                  <ChevronRight size={26} />
                                </button>
                              </>
                            )}

                            <div
                              className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Image
                                src={getStorageUrl(nutritionImages[nutritionLightbox] ?? '')}
                                alt={`${product.designation_fr || 'Produit'} — valeurs nutritionnelles ${nutritionLightbox + 1}`}
                                width={900}
                                height={700}
                                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                                quality={90}
                              />
                              {nutritionImages.length > 1 && (
                                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-xs bg-black/40 px-2 py-0.5 rounded-full">
                                  {nutritionLightbox + 1} / {nutritionImages.length}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </ProductInfoSection>

                <ProductInfoSection id="pdp-questions" title={product.zone4 || 'Questions fréquentes'}>
                  <div className="p-4 sm:p-5 lg:p-6 pt-5 sm:pt-6 border-t border-hairline">
                  <h2 className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold mb-3 text-ink-1">
                    {product.zone4 || 'Questions Fréquentes'}
                  </h2>
                  {hasProductFaq ? (
                    <div className="space-y-5">
                      {productFaqItems.map((item) => (
                        <div
                          key={item.id}
                          className="border-b border-hairline pb-5 last:border-0 last:pb-0"
                        >
                          <h4 className="font-semibold text-ink-1 mb-2 flex items-start gap-2">
                            <span className="text-brand shrink-0">Q.</span>
                            <span>{item.q || '—'}</span>
                          </h4>
                          <div className="pl-6 text-sm sm:text-base text-ink-2 leading-relaxed whitespace-pre-wrap">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : hasLegacyQuestionsHtml ? (
                    <div
                      className="pdp-prose"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.questions || '') }}
                    />
                  ) : null}
                  </div>
              </ProductInfoSection>

            </div>
              );
            })()}

          </div>
        </div>

        {/*
          -- THE ORDER OF THE PAGE BELOW THE HERO ---------------------------------------------
          It ran: reviews, video, comparison, bundle, carousel. The reference storefront runs
          bundle, reviews, carousel, and its order is better for a reason that survives being
          argued with - it follows the decision, not the CMS.

          A reader who reaches the bottom of the specifications has decided WHAT. So:

            1. the video, because it is the last piece of information ABOUT this product and
               belongs against the sections it explains;
            2. the bundle, which is the only "and also…" that is a help rather than an
               interruption, and it is placed while the intent to buy is still live;
            3. the comparison, for the reader whose answer is "this one, but bigger" - decision
               support, so it sits with the bundle and before the social proof;
            4. the reviews, which is where a hesitant reader goes to be convinced or put off;
            5. the carousel, which is the exit.

          Reviews were FIRST, immediately under the specifications, which put the page's emptiest
          block (no product has a published review) directly in the path of every reader before
          they were offered a single thing to do.

          `space-y-*` on the wrapper is the other half of this: the blocks used to butt straight
          into one another with no rule and no air, so the comparison table read as a continuation
          of the accordion above it. One rhythm, set once.
        */}
        <div className="space-y-10 sm:space-y-12 lg:space-y-16">

        {/*
          -- PHOTOS DU PRODUIT: A BAND, NOT A DRAWER ------------------------------------------
          Owner, 17/08/2026: *"there is some products that have more than 2 [images], always the
          first 2 are the front and the back of the product and the rest are instructions. I want
          the instructions to be shown in the page as a grid of images, well designed and
          INTEGRATED WITH THE PAGE."*

          The first attempt put the grid inside the accordion stack, and it satisfied the letter of
          that and not the point of it. Measured at 1440: the stack sits in the gallery column, so
          the column is 591px wide, so a three-across grid drew each label photograph at 146px.
          These are photographs of PRINTED TEXT - a Supplement Facts panel, a directions paragraph,
          an allergen line. At 146px none of it is legible, which makes the grid a picture of
          information rather than the information.

          Full width, four across, the same tiles render at 292px. That is exactly 2x, it is the
          difference between "there is a label" and "I can read the label", and it is the reason
          this is the FIRST thing below the hero rather than the seventh thing inside a drawer.

          The id is unchanged, so the "+N photos" tile in the gallery rail still lands here.
        */}
        {labelImages.length > 0 && (
          <section
            id="pdp-label-photos"
            className="min-w-0 scroll-mt-24 lg:scroll-mt-36"
            aria-label="Photos du produit"
          >
            <SectionHeader
              kicker="En détail"
              title="Photos du produit"
              subtitle="Les photographies de l'emballage — étiquette, mode d'emploi et informations imprimées. Cliquez pour agrandir."
            />
            <ProductLabelGrid images={labelImages} altBase={imageAltBase} />
          </section>
        )}
        {/*
          Official brand video.

          `loading="lazy"` and youtube-nocookie are both deliberate: the iframe is below the fold on
          every layout, and nocookie sets no tracking cookie until the visitor actually presses play.
          The id is re-validated by videoId() before it reaches this src — the value arrives from a
          JSON column, and the set of things that can write to a JSON column only grows over a
          project's life.
        */}
        {officialVideoId && (
          <div className="min-w-0">
            <SectionHeader kicker="En vidéo" title="Vidéo officielle" />
            <div className="overflow-hidden rounded-xl border border-hairline">
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  src={embedUrl(officialVideoId)}
                  title={videoTitle(initialProduct.official_video, initialProduct.designation_fr ?? '')}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            </div>
            {initialProduct.official_video?.channel && (
              <p className="mt-2 text-sm text-ink-2">
                Vidéo publiée par {initialProduct.official_video.channel}.
              </p>
            )}
          </div>
        )}

        {/*
          ── COMPLÉTEZ VOTRE COMMANDE ──────────────────────────────────────────────────────────
          Placed after the comparison table and before the carousel on purpose: the table is where
          a shopper finishes deciding WHICH, and the carousel is where they leave. Between the two
          is the only point on this page where "and also…" is a help rather than an interruption.

          It renders nothing unless the current product and two companions are all genuinely
          addable — see the component, which explains why that is strict and why the heading does
          not claim co-occurrence data we do not have.
        */}
        <div className="min-w-0">
          <FrequentlyBoughtTogether
            product={product}
            complements={complementProducts}
            imageFor={(entry) => getStorageUrl(entry.cover || '')}
            onAdd={handleAddManyToCart}
          />
        </div>

        {/*
          Comparison table — content parity with the crawler view.

          The carousel below sells; this answers "which of these, and why". Same data, same helper,
          same columns as CrawlerProductView, so Googlebot and a customer see the same facts. No
          price-per-kilo column here either — see util/productComparison.ts.
        */}
        {comparisonRows.length > 0 && (
          <div className="min-w-0">
            <SectionHeader kicker="Comparatif" title="Comparer avec des produits similaires" />
            <ProductComparisonTable rows={comparisonRows} />
          </div>
        )}

        {/*
          `scroll-mt-24 lg:scroll-mt-36`: the rating in the hero links here, and the site header is
          sticky at z-50. MEASURED rather than guessed - that header is 122px tall at 1024, 1280 and
          1440 while scrolled, so the 112px this first shipped with still parked the heading three
          pixels UNDER it. 144px clears it with air; 96px is the mobile header plus the same air.

          `id` moved from the inner div to the <section> so the anchor and the landmark are the
          same element - two ids for one destination is how they drift apart.
        */}
        <section id="reviews" className="mx-auto w-full scroll-mt-24 lg:scroll-mt-36" aria-label="Avis clients">
            <div className="min-w-0">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              {/*
                ── THE ASK SITS IN THE HEADER, AND THERE IS ONE OF IT ─────────────────────────
                It was written TWICE — the same eighteen lines in the has-reviews branch and again
                in the empty state, both at the FOOT of the section. That is the same duplication
                that let this page's two hero trees drift, at a smaller scale, and it put the one
                control that grows this section behind however many reviews already exist.

                The reference storefront puts "write a review" top-right of the heading, which is
                also where it is useful: a visitor who has just read the rating is deciding whether
                to contribute, and a visitor who scrolled past twelve reviews has stopped reading.
              */}
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-hairline pb-3 sm:pb-4">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold uppercase leading-[0.95] tracking-tight text-ink-1 sm:text-3xl">
                    Avis clients
                  </h2>
                  {reviewCount > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <StarRating rating={rating} size="md" />
                      <span className="text-sm text-ink-2 tabular-nums">
                        {rating.toFixed(1)} sur 5 · {reviewCount} avis
                      </span>
                    </div>
                  )}
                </div>

                {isAuthenticated ? (
                  <Button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="min-h-[44px] w-full font-display font-semibold uppercase tracking-wide sm:w-auto"
                    size="default"
                  >
                    {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                  </Button>
                ) : (
                  /*
                    This was "Connectez-vous pour laisser un avis" and it went to /login. Asking
                    somebody who has just formed an opinion to create an account first is how a
                    review is lost — so the button now opens the same form, and the form asks for a
                    name instead of a password. What changes is where the submission goes and
                    whether it can touch the rating, not whether it is accepted.
                  */
                  <Button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    variant="outline"
                    className="min-h-[44px] w-full border-brand font-display font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand sm:w-auto"
                    size="default"
                  >
                    {showReviewForm ? 'Annuler' : 'Écrire un avis'}
                  </Button>
                )}
              </div>

              {reviewCount > 0 ? (
                <>
                  {/*
                    The score and its distribution.

                    Written in TOKENS now — it carried `bg-gray-50/60 dark:bg-gray-900/40`,
                    `border-gray-200 dark:border-gray-800` and `dark:sm:border-gray-800`, which is
                    five hand-maintained colour pairs on one card. `bg-sunken` and `border-hairline`
                    resolve correctly in both themes with no `dark:` variant at all, and the design
                    lint has been counting those pairs against this file since the day it shipped.

                    The reference storefront prints only "4.3 out of 5". The distribution stays:
                    five bars tell a reader whether a 4.3 is everyone agreeing or two people
                    fighting, and that is the question somebody scrolling to reviews is asking.
                  */}
                  <div className="grid gap-5 rounded-2xl border border-hairline bg-sunken p-4 sm:grid-cols-[auto,1fr] sm:items-center sm:gap-8 sm:p-6">
                    <div className="flex flex-col items-center sm:items-start sm:border-e sm:border-hairline sm:pe-8">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-bold tracking-tight tabular-nums text-5xl text-ink-1">
                          {rating > 0 ? rating.toFixed(1) : '–'}
                        </span>
                        <span className="text-ink-3 text-base tabular-nums">/ 5</span>
                      </div>
                      <StarRating rating={rating} size="lg" className="mt-1.5 gap-1" />
                      <p className="mt-2 text-xs sm:text-sm text-ink-3">Basé sur {reviewCount} avis</p>
                    </div>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((starLevel) => {
                        const count = reviews.filter(r => r.stars === starLevel).length;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                          <div key={starLevel} className="flex items-center gap-2">
                            <span className="flex w-9 shrink-0 items-center gap-0.5 text-xs text-ink-2 tabular-nums">
                              {starLevel} <Star className="h-3 w-3 fill-current text-amber-400" />
                            </span>
                            {/* The TRACK is `bg-rule` (#D6D2CC, 1.51:1 — the band-seam grey), not `bg-rule-strong`
                                  (#8C8C92, 3.34:1 — the brand-wall grey). At rule-strong the empty
                                  portion of the bar was darker and heavier than the amber fill, so
                                  the eye read the GREY as the data: a distribution where one review
                                  in three is five stars looked like a mostly-full dark bar with a
                                  short highlight on it. An empty track is structure, not a value. */}
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
                              {/* `transition-[width]`, not `transition-all`: DESIGN_SYSTEM §9 asks
                                  for named properties because `all` also animates `ring-color`,
                                  so a focus ring fades in instead of appearing. 500ms because
                                  this bar changes when the SORT changes, and a bar that jumps
                                  reads as a re-render rather than as the same data reordered. */}
                              <div
                                className="h-full rounded-full bg-amber-400 transition-[width] duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-7 shrink-0 text-right text-xs text-ink-3 tabular-nums">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Removed: fabricated "Ce que disent les clients" summary + hardcoded
                      "Points forts des avis" badges. They rendered identical, invented review
                      sentiment on EVERY product regardless of real reviews — a trust liability and
                      a Google review-content policy risk. The real, per-product reviews render below. */}

                  {/* The order is the reader's choice from two reviews up - below that there is
                      nothing to sort and the control would be furniture. */}
                  {reviewCount > 1 && (
                    <div className="flex items-center justify-end gap-2">
                      <label
                        htmlFor="review-sort"
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-3"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                        Trier par
                      </label>
                      <select
                        id="review-sort"
                        value={reviewSort}
                        onChange={(event) => setReviewSort(event.target.value as ReviewSort)}
                        className="min-h-[44px] rounded-xl border border-hairline bg-elevated px-3 text-sm font-medium text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <option value="recent">Plus récents</option>
                        <option value="best">Meilleures notes</option>
                        <option value="worst">Notes les plus basses</option>
                      </select>
                    </div>
                  )}

                  {/*
                    ── THE REVIEW ROW ──────────────────────────────────────────────────────────
                    Owner, 17/08/2026: *"the costumer reviews should be like impact — beautiful
                    design"*.

                    Three changes, and the first is a deletion. The row opened with a 36px circle
                    holding the reviewer's initial on a red tint. It looked like an avatar and it is
                    not one — there is no photograph behind it, so every review by anyone called
                    Mohamed rendered the same red M, and a column of near-identical coloured discs
                    is visual noise that carries no information. The reference has none. Gone, along
                    with the `bg-red-100 dark:bg-red-950/40` pair it needed.

                    THE DATE MOVED TO THE END OF THE ROW. It sat immediately after the name, so the
                    eye had to step over a date to get from one reviewer to the next; against the
                    trailing edge it forms its own column and the names line up.

                    THE STARS GET THEIR OWN LINE, under the name, which is the reference's order and
                    the right one: the name and the badge answer "who is this", the stars answer
                    "what did they think", and stacking them lets a reader scan either column alone.
                  */}
                  <ul className="divide-y divide-hairline">
                    {reviewsToShowOnPage.map((review) => {
                      /*
                        THREE sources, in this order, and the middle one is new.

                        `user.name` is a member. `author_name` is somebody who reviewed WITHOUT an
                        account — that column did not exist before the guest-review endpoint, and
                        without reading it here every anonymous review on the site would render as
                        "Client". "Client" survives as the last fallback because the legacy backlog
                        genuinely has neither: those rows have no user and no author_name.
                      */
                      const reviewerName =
                        review.user?.name?.trim() || review.author_name?.trim() || 'Client';
                      return (
                        /* A hover plate that bleeds past the text column, so a row highlights as a
                           ROW rather than as a rectangle inset inside a list. `-mx-3 px-3` is the
                           same trick the applied-filter chips use to grow a target without moving
                           the text. Colour only — a review is not a control and must not lift. */
                        <li
                          key={review.id}
                          className="-mx-3 rounded-xl px-3 py-4 transition-colors duration-150 hover:bg-sunken sm:py-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              {/* A link only when there is a page to link to — a guest review has
                                  no member page and linking one would 404. MemberLink decides. */}
                              <MemberLink
                                userId={review.user?.id}
                                name={reviewerName}
                                className="truncate text-sm font-bold text-ink-1"
                              />
                              {/*
                                ── ACHAT VÉRIFIÉ ──────────────────────────────────────────────
                                Shown on exactly the reviews that carry evidence — `verified` set,
                                or an order id attached — and on no others.

                                That distinction is the whole value of the badge, and it is not
                                cosmetic here: the catalogue carries a large SEEDED review backlog
                                with `verified = 0` and `commande_id = null` on every row. Printing
                                the badge unconditionally would put "achat vérifié" under thousands
                                of reviews that were never purchases, which is a false statement to
                                a customer before it is anything else. Same test as
                                buildAggregateRatingAndReviews uses to decide what may enter the
                                structured data — one rule, both places.
                              */}
                              {(review.verified === 1 || review.verified === true || review.commande_id != null) && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                                  <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  Achat vérifié
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-ink-3">
                              {review.created_at
                                ? new Date(review.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })
                                : ''}
                            </span>
                          </div>

                          <StarRating rating={review.stars} size="sm" className="mt-1.5" />

                          {review.comment && (
                            <p className="mt-2 text-sm leading-relaxed text-ink-2">{review.comment}</p>
                          )}

                          {/*
                            The conversation. Collapsed to a single 44px row unless there is
                            something to show — see ReviewThread for why it is not expanded
                            inline, and why the replies are fetched on open rather than shipped
                            with the page.
                          */}
                          <ReviewThread
                            reviewId={review.id}
                            replyCount={review.replies_count}
                            reviewerName={reviewerName}
                          />
                        </li>
                      );
                    })}
                  </ul>

                  {visibleReviewCount < sortedReviews.length ? (
                    <Button
                      variant="outline"
                      className="min-h-[44px] w-full whitespace-normal border-hairline py-2.5 text-xs leading-snug sm:text-sm"
                      size="default"
                      onClick={() => setVisibleReviewCount((prev) => prev + REVIEW_PAGE_SIZE)}
                    >
                      Charger plus d'avis ({sortedReviews.length - reviewsToShowOnPage.length} restants sur {reviewCount})
                    </Button>
                  ) : (
                    <p className="text-sm text-center text-ink-3">
                      Tous les avis sont affichés ({reviewCount})
                    </p>
                  )}

                </>
              ) : (
                /*
                  The empty state says one true thing and asks for nothing — the ask is in the
                  header above, where it is now the only copy of itself.

                  It stays deliberately quiet. Every product on this catalogue is in this state
                  today: 1,082 orders exist and none is marked `livree`, so the review-request
                  pipeline has never fired and not one product has a published review. A loud
                  empty state repeated across 11,263 pages would read as a site with no customers.
                */
                /*
                  ── AND IT IS THE ONLY STATE THIS SECTION IS EVER IN (owner, 20/08/2026) ──────
                  *"work more on the avis section and avis components — redesign them."*

                  Not one product in this catalogue has a published review: I sampled the 300 most
                  popular and every one returns `review_count: 0`. So this branch — two grey lines
                  in a box — is what "Avis clients" renders on all 11,263 product pages, under a
                  32px heading, above the related-products rail. It was the emptiest 90px on the
                  site and it was on every page of it.

                  What replaced it is still quiet, deliberately: a loud "BE THE FIRST!" repeated
                  across a whole catalogue reads as a shop with no customers, which is the thing to
                  avoid. What it adds is the one fact that is worth a visitor's attention here —
                  that a review attached to a real order is marked as such.

                  THAT SENTENCE IS CAREFULLY WORDED AND THE WORDING IS THE POINT. It says reviews
                  from an order CARRY A BADGE. It does not say only buyers may review, because that
                  is not true of this backend: `ClientController` publishes any authenticated
                  review of 4 stars or more, purchase or no purchase. The badge test in the row
                  below (`verified === 1 || commande_id != null`) is the same one
                  buildAggregateRatingAndReviews uses to decide what may enter the structured data,
                  and this copy describes exactly that and nothing more.
                */
                <div className="rounded-2xl border border-hairline bg-sunken px-5 py-8 text-center sm:py-10">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-elevated">
                    <MessageSquare className="h-5 w-5 text-ink-3" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-bold uppercase tracking-wide text-ink-1">
                    Aucun avis pour le moment
                  </p>
                  <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-ink-3">
                    Soyez le premier à donner votre avis sur ce produit.
                  </p>
                  <p className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-elevated px-3.5 py-2 text-start text-[12.5px] leading-snug text-ink-2">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                    Les avis rattachés à une commande portent la mention «&nbsp;Achat vérifié&nbsp;».
                  </p>
                </div>
              )}

              {/* Review form. Tokens, not a `bg-gray-50 dark:bg-gray-800/50` + `border-red-200
                  dark:border-red-900/50` quartet. The brand edge survives as a single
                  `border-brand` — it marks the one part of this section the reader can act on. */}
              {showReviewForm && (
                <div className="relative min-w-0 rounded-xl border border-brand bg-sunken p-3 sm:p-4 lg:p-5">
                  <h4 className="font-bold mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base text-ink-1">Votre avis</h4>

                  {/*
                    THE HONEYPOT. Four separate reasons a person never reaches it: it is moved off
                    the visible page rather than `display:none` (some bots skip hidden inputs),
                    removed from the tab order, hidden from assistive technology, and told not to
                    autofill. The last one is the failure mode this technique actually has — an
                    autofilled honeypot silently discards a real customer's review — which is also
                    why the field is named `hp_field` and not `website` or `company`.
                  */}
                  <div className="pointer-events-none absolute" aria-hidden="true">
                    <label htmlFor="hp_field" className="absolute h-px w-px overflow-hidden [clip-path:inset(50%)]">
                      Ne pas remplir
                    </label>
                    <input
                      id="hp_field"
                      name="hp_field"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      /* The clip is on the INPUT, not on a wrapper. Clipping the wrapper hides the
                         field visually but leaves the input's own box at full size — measured at
                         5160px², which measure-reviews failed, correctly: "is it inside something
                         hidden" and "is it unreachable" are different questions, and only the
                         second one is the guarantee this needs.

                         `clip-path` rather than `-left-[9999px]`, because the off-screen trick
                         assumes LTR and this site renders Arabic — in RTL a -9999px offset puts the
                         field on the visible side of the page. And not `display:none`, which is the
                         one form of hiding some bots are written to skip. */
                      className="absolute h-px w-px overflow-hidden border-0 p-0 opacity-0 [clip-path:inset(50%)]"
                      value={reviewHoneypot}
                      onChange={(e) => setReviewHoneypot(e.target.value)}
                    />
                  </div>

                  {/*
                    ── THE REWARD, STATED WITH ITS CONDITION ATTACHED ─────────────────────────
                    A review pays 50 points. Saying that without the condition would be the more
                    persuasive sentence and the wrong one: the points are only credited for a
                    product you actually bought and received, so somebody who writes a review on a
                    product they browsed would be told they had earned something and then not be
                    paid. That is worse than never mentioning it.

                    Shown to signed-in customers only. A guest cannot earn — there is no account to
                    credit — and the guest branch below already explains what their review does and
                    does not do.
                  */}
                  {isAuthenticated && (
                    <p className="mb-3 flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 p-2.5 text-[12.5px] leading-snug text-ink-2">
                      <Coins className="mt-px h-4 w-4 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
                      <span>
                        Un avis publié sur un produit que vous avez commandé et reçu vous rapporte{' '}
                        <span className="font-semibold text-ink-1">
                          {REVIEW_POINTS_AWARD} points
                        </span>{' '}
                        ({formatTnd(pointsToDt(REVIEW_POINTS_AWARD))}).
                      </span>
                    </p>
                  )}

                  <div className="space-y-2 sm:space-y-3">
                    {!isAuthenticated && (
                      <div>
                        <label htmlFor="guest-review-name" className="block text-xs sm:text-sm font-semibold mb-1 text-ink-1">
                          Votre nom *
                        </label>
                        <input
                          id="guest-review-name"
                          value={guestReviewName}
                          onChange={(e) => setGuestReviewName(e.target.value.slice(0, 60))}
                          placeholder="Prénom ou pseudo"
                          className="min-h-[44px] w-full min-w-0 rounded-lg border border-hairline bg-elevated p-3 text-sm text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        />
                        {/* Said plainly and up front, because it is true and because finding out
                            later feels like being ignored. It is also the honest framing of the
                            trade: no account, so no proof of purchase, so a human looks first. */}
                        <p className="mt-1.5 text-xs leading-snug text-ink-3">
                          Sans compte, votre avis est publié après vérification et n’est pas compté
                          dans la note du produit.{' '}
                          <Link href="/login" className="font-semibold text-brand underline-offset-2 hover:underline">
                            Se connecter
                          </Link>
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-2 text-ink-1">Note *</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setReviewStars(star)} className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}>
                            <Star className={`h-6 w-6 fill-current ${star <= reviewStars ? 'text-amber-400' : 'text-hairline'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-1 text-ink-1">
                        {isAuthenticated ? 'Commentaire (optionnel)' : 'Commentaire *'}
                      </label>
                      <textarea value={reviewComment} onChange={(e) => { if (e.target.value.length <= 500) setReviewComment(e.target.value); }} className="w-full min-w-0 rounded-lg border border-hairline bg-elevated p-3 text-sm text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" rows={3} placeholder="Partagez votre expérience..." maxLength={500} />
                      <p className="text-xs mt-0.5 text-ink-3">{reviewComment.length}/500</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSubmitReview} disabled={reviewStars === 0 || isSubmittingReview} className="flex-1 bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-semibold" size="sm">
                        {isSubmittingReview ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Publication...</> : 'Publier'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setShowReviewForm(false); setReviewStars(0); setReviewComment(''); setGuestReviewName(''); }}>Annuler</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/*
          -- PRODUITS SIMILAIRES: ONE RAIL, NOT A CAROUSEL AND A GRID --------------------------
          This was `flex md:grid … md:grid-cols-4`: a swipeable carousel on phones that became a
          static grid from `md`. One rail now, at every width, with the reference storefront's
          chevrons — see the component for the measurement that says those chevrons do not appear
          on today's data, and why it is still the right shape.

          `viewAllHref` is the part that does work immediately: the API returns four suggestions and
          only four, so the reader whose answer is none of them had nowhere to go from here. Now
          they have the sub-category, which is also an internal link from 11,263 product pages into
          the category pages this site is trying to rank.
        */}
        {similarProducts.length > 0 && (
          <div className="min-w-0">
            <SectionHeader
              kicker="Vous aimerez aussi"
              title="Produits similaires"
              viewAllHref={product.sous_categorie?.slug ? `/${product.sous_categorie.slug}` : '/shop'}
              viewAllLabel="Voir tout"
            />
            <RelatedProductsRail products={similarProducts} />
          </div>
        )}
        </div>

      </main>

      {/* Sticky CTAs (Mobile): compact — Total inline with primary CTA, secondary below */}
      <div
        className={cn(
          /*
            NO LONGER `lg:hidden`. The reference storefront keeps a bar like this on desktop and it
            is now necessary here rather than decorative: the information sections moved into the
            gallery column, so a desktop page is several thousand pixels tall and the buy box
            scrolls away after the first screen.

            `bottom-tabbar` already resolves correctly at both ends — `--tabbar-h` is 56px below
            768px and 0px above it (styles/tokens.css), so the same class sits above the mobile tab
            bar and flush to the bottom on a desktop. One element, one IntersectionObserver, no
            second tree.
          */
          'fixed bottom-tabbar left-0 right-0 bg-canvas border-t border-hairline px-3 pt-2 shadow-card z-sticky-cta lg:px-6',
          'transition-transform duration-200 motion-reduce:transition-none',
          // Out of view, not merely translated: a button that is off-screen but still focusable is
          // a tab stop that goes nowhere, and screen readers would announce two "Ajouter au panier".
          stickyBarVisible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        )}
        data-sticky-cta=""
        aria-hidden={!stickyBarVisible}
        // Was z-50 — above the tab bar — so this bar painted over the raised Boutique tile on
        // every product page. Now below it, with `--tabbar-raise` of bottom padding so the tile
        // overlaps this surface and never these buttons. The bar is on `bg-canvas`, which the
        // tab bar also uses, so the tile ring cut-out blends instead of showing a halo.
        // The safe-area inset moved into --tabbar-h itself; padding for it here would double it.
        style={{ paddingBottom: 'calc(var(--tabbar-raise) + 0.5rem)' }}
      >
        <div className="mx-auto flex w-full max-w-site flex-col gap-2 lg:flex-row lg:items-center lg:gap-4 lg:py-1.5">
          {/*
            WHICH product, on desktop only. A bar that says "Total 535 DT / Ajouter au panier" is
            unambiguous on a phone, where it is the only thing on screen. On a desktop it floats
            over a page of related products and a comparison table, so it has to name what it is
            about to put in the basket. Below `lg` this costs nothing: it does not render.
          */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            {productImage && (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-hairline bg-elevated">
                <Image src={productImage} alt="" fill sizes="44px" className="object-contain p-0.5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-1">{product.designation_fr}</p>
              {product.brand?.designation_fr && (
                <p className="truncate text-xs text-ink-3">{product.brand.designation_fr}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 lg:shrink-0">
            <div className="flex flex-col leading-tight shrink-0">
              <span className="text-[10px] font-display uppercase tracking-wide text-ink-3">Total</span>
              <span className="font-display font-bold tracking-tight tabular-nums text-lg text-brand">
                {(displayPrice * quantity).toFixed(2)} DT
              </span>
            </div>
            {/* Sur commande: one request CTA instead of two dead buttons. Mirrors the desktop
                block above — the mobile sticky bar is 81% of this site's traffic, so leaving it on
                the old branch would have meant almost nobody saw the change. */}
            {stockStatus.isBackOrder ? (
              <Button
                type="button"
                size="default"
                onClick={() => setRequestOpen(true)}
                className="flex-1 min-w-0 min-h-[44px] h-auto py-2 text-sm bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-bold"
                aria-label="Demander ce produit"
              >
                <Mail className="h-4 w-4 mr-2 shrink-0" />
                Demander ce produit
              </Button>
            ) : (
              <Button
                size="default"
                className="flex-1 min-w-0 min-h-[44px] h-auto py-2 text-sm bg-brand hover:bg-brand-hover text-on-brand font-display uppercase tracking-wide font-bold"
                onClick={handleAddToCart}
                disabled={stockStatus.isOutOfStock}
                aria-label="Ajouter au panier"
              >
                <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                {stockStatus.isOutOfStock ? 'Rupture' : 'Ajouter au panier'}
              </Button>
            )}
            {/* On desktop the two CTAs sit side by side in the same row rather than stacked,
                because there is room and a full-width secondary button reads as the primary one. */}
            {!stockStatus.isBackOrder && (
              <Button
                size="default"
                variant="outline"
                className="hidden min-h-[44px] h-auto shrink-0 border-brand bg-transparent py-2 font-display text-sm font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand lg:inline-flex"
                onClick={handleQuickOrderClick}
                disabled={stockStatus.isOutOfStock}
                aria-label="Commander maintenant"
              >
                <Zap className="h-4 w-4 mr-2 shrink-0" />
                Commander maintenant
              </Button>
            )}
          </div>

          {!stockStatus.isBackOrder && (
            <Button
              size="default"
              variant="outline"
              className="w-full min-h-[44px] h-auto border-brand bg-transparent py-2 font-display text-sm font-semibold uppercase tracking-wide text-brand hover:bg-brand hover:text-on-brand lg:hidden"
              onClick={handleQuickOrderClick}
              disabled={stockStatus.isOutOfStock}
              aria-label="Commander maintenant"
            >
              <Zap className="h-4 w-4 mr-2 shrink-0" />
              Commander maintenant
            </Button>
          )}
        </div>
      </div>

      {requestOpen && (
        <ProductRequestDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          productName={product.designation_fr || 'Ce produit'}
          productPath={buildProductUrlPath(product)}
          priceText={`${displayPrice.toFixed(2)} DT`}
        />
      )}

      <ScrollToTop />
    </div>
  );
}
