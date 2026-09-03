'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSection } from './ProfileSection';
import { OrdersSection } from './OrdersSection';
import { FidelitySection } from './FidelitySection';
import { AccountSummary } from './AccountSummary';
import { ReviewsSection } from './ReviewsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { User, Package, Coins, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { Section } from '@/app/components/layout/Section';
import { AccountPageSkeleton } from './AccountSkeletons';

/**
 * ── THE ACCOUNT, ON THE SITE'S OWN VOCABULARY (owner, 20/08/2026) ───────────────────────────
 * *"rework the account of the user. And what can the user do in the account?"*
 *
 * Two separate problems, and the second one is the interesting one.
 *
 * ── 1. IT WAS NOT WRITTEN IN THIS DESIGN SYSTEM AT ALL ──────────────────────────────────────
 * Five files, none of them in `design-baseline.json`'s good graces: `bg-gray-50`, `bg-white`,
 * `dark:bg-gray-950`, `text-gray-600 dark:text-gray-400` twins, and `red-600` throughout — the
 * legacy signal red, not the brand's #D03B04. `OrdersSection` carried the worst violation density
 * in the whole repository. Side by side with the homepage these screens did not read as the same
 * shop, which on the page where somebody checks what they are owed is the worst place for it.
 *
 * Everything here is tokens now: `bg-sunken` page, `bg-elevated` cards, `border-hairline`, ink
 * ramp, `brand`. `<Section>` supplies the rail and the band padding, which is what removes the
 * inline `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12` (DS007 + DS008 in one line).
 *
 * ── 2. THE PAGE OPENED ON A FORM ────────────────────────────────────────────────────────────
 * `defaultValue="profile"` — so the first thing this page showed a customer who had just logged
 * in was an editable copy of their own name, and the two things they actually came for (the points
 * balance, the state of an order) were each behind a tab they had to know to press.
 *
 * `AccountSummary` now sits above the tabs and answers both without a click, on every tab. The
 * default tab moves to `orders`, because "where is my order" is the question this page is opened
 * with; the profile form is the thing you visit once and it is now last.
 *
 * ── WHAT A CUSTOMER CAN ACTUALLY DO HERE, WHICH IS THE OWNER'S QUESTION ─────────────────────
 * Verified against the code behind each tab, rather than against what the labels imply:
 *
 *   Commandes  list every order with its status and total; open one for its lines and delivery
 *              address (`/account/orders/[id]`).
 *   Fidélité   see the balance, its dinar value, and every earn/spend/adjustment row in the
 *              ledger. Spending happens at checkout, not here — deliberately.
 *   Profil     edit name, email, phone; change password.
 *
 * And what is NOT here, because the backend has nowhere to put it: a saved delivery address book
 * (`AddressSelector` is a gouvernorat picker over a static dataset), and favourites (localStorage,
 * no table, so they do not follow the account to another device). Neither is claimed anywhere in
 * this UI — see the note in `AuthShell` about the two benefit rows that were cut for the same
 * reason.
 */
export default function AccountPage({ initialSection = 'orders' }: { initialSection?: 'orders' | 'reviews' }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchOrders } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
    // Only fetch once when authenticated, not on every fetchOrders change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-sunken">
      <Section as="div" spacing="default" first last>
        <PageHeader kicker="Espace client" title="Mon Compte" />

        <AccountSummary />

        <Tabs defaultValue={initialSection} className="mt-6 w-full">
          {/*
            The list is `bg-elevated` on a `bg-sunken` page, not the other way round: the page is
            the sand and the controls sit on white, which is the alternation the rest of the site
            uses. As `bg-sunken` on `bg-sunken` — what the tokens translation of the old
            `bg-gray-100` would have been — the strip would have vanished into the page.

            `min-h-[44px]` on the triggers: they were `py-2.5` around a 20px line, which lands at
            40px. Three of the four controls above the fold on this page were under the target.
          */}
          <TabsList className="mb-6 grid h-auto w-full grid-cols-4 gap-1 rounded-xl border border-hairline bg-elevated p-1">
            <TabsTrigger
              value="orders"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-display text-[13px] font-bold uppercase tracking-wide text-ink-2 transition-colors data-[state=active]:bg-brand data-[state=active]:text-on-brand"
            >
              {/* The icons are `hidden xs:inline-flex`-in-spirit: at 390 the rail is 350px, so each
                trigger gets ~116px, and a 16px glyph plus its 8px gap took "COMMANDES" past the
                edge — it rendered as "COMMAN…". The label is the part that carries meaning, so on
                the narrowest phones the glyph is what goes. */}
              <Package className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
              <span className="sm:hidden">Achats</span>
              <span className="hidden sm:inline">Commandes</span>
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-display text-[13px] font-bold uppercase tracking-wide text-ink-2 transition-colors data-[state=active]:bg-brand data-[state=active]:text-on-brand"
            >
              <MessageSquare className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
              <span className="truncate">Avis</span>
            </TabsTrigger>
            <TabsTrigger
              value="fidelite"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-display text-[13px] font-bold uppercase tracking-wide text-ink-2 transition-colors data-[state=active]:bg-brand data-[state=active]:text-on-brand"
            >
              <Coins className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
              <span className="truncate">Fidélité</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-display text-[13px] font-bold uppercase tracking-wide text-ink-2 transition-colors data-[state=active]:bg-brand data-[state=active]:text-on-brand"
            >
              <User className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
              <span className="truncate">Profil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersSection />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsSection />
          </TabsContent>

          <TabsContent value="fidelite">
            <FidelitySection />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSection />
          </TabsContent>
        </Tabs>
      </Section>
    </main>
  );
}
