import { ShopHeader } from '@/app/components/ShopHeader';
import { ShopFooter } from '@/app/components/ShopFooter';

/**
 * Shared chrome for the storefront.
 *
 * Header and Footer were rendered inside 48 separate page/loading files, so they fully
 * REMOUNTED on every navigation — re-running the header's scroll listeners, nav fallback
 * effects and cart/favourites subscriptions each time, and discarding open-menu/scroll state.
 * Rendering them once in a layout keeps them mounted across navigations within this group.
 *
 * This is a route GROUP: the parenthesised segment does not appear in any URL, so every route
 * moved in here keeps its exact path.
 *
 * Auth pages (login/register/forgot-password/reset-password) deliberately have NO chrome —
 * AuthShell provides their own — so they stay outside this group. app/not-found.tsx and
 * app/error.tsx also live outside every group and must keep rendering chrome explicitly.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopHeader />
      {children}
      <ShopFooter />
    </>
  );
}
