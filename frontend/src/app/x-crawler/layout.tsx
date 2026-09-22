import { ShopHeader } from '@/app/components/ShopHeader';
import { ShopFooter } from '@/app/components/ShopFooter';

/**
 * Site chrome for the crawler-serving routes — the same header and footer the human storefront
 * renders, and for the same reason.
 *
 * WHY THIS FILE EXISTS
 * `ShopHeader`/`ShopFooter` are mounted by `app/(shop)/layout.tsx`, and the x-crawler routes sit
 * OUTSIDE that route group. So every URL middleware rewrites for a bot — every category, brand,
 * product and /shop page, i.e. ~95% of what Googlebot fetches — was served with no site
 * navigation at all, while a browser got the full mega-menu and footer. Measured on the live
 * origin 22/09/2026 (unique internal hrefs, Googlebot UA vs Chrome UA):
 *
 *     /creatine                                      bot 50   human 68
 *     /mass-gainers/serious-mass-5-45-kg-optimum-…   bot 23   human 60
 *     /shop                                          bot 36   human 57
 *
 * The bot-only set was missing exactly the chrome: /proteine-tunisie,
 * /creatine-monohydrate-tunisie, /blog, /brands, /packs, /pack-builder, /prise-de-masse,
 * /perte-de-poids, /performance, /proteine-sousse, /contact, /qui-sommes-nous and the policy
 * pages. The one visitor whose link graph decides rankings was reading the money pages on ~40%
 * of the real internal link graph, and a page that offers fewer links to a crawler than to a
 * user is also the weak spot in the dynamic-rendering defence: this route set is meant to be a
 * PARITY PROJECTION of the human page (see util/isCrawler.ts), not a lossy one.
 *
 * ON THE "ZERO JAVASCRIPT" NOTE IN THE VIEW FILES
 * CrawlerProductView/CrawlerCategoryView remain pure server components with no client code of
 * their own; the header and footer are the same two client components the human page ships, and
 * they server-render their anchors, which is the part that matters here. The nav/categories/CMS
 * data they read is already fetched once in app/layout.tsx and provided by <Providers>, so no
 * extra request is made and the ISR cache of these routes is unaffected.
 *
 * The two components self-suppress on /account, /checkout and /pack-builder; none of those is
 * ever rewritten to x-crawler, so both always render here.
 */
export default function CrawlerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopHeader />
      {children}
      <ShopFooter />
    </>
  );
}
