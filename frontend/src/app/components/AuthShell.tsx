'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, CreditCard, ArrowLeft, Eye, EyeOff, Loader2, Coins, PackageCheck, Zap, Star } from 'lucide-react';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import { CASHBACK_PERCENT, REDEEM_POINTS_PER_DT } from '@/util/loyaltyPoints';

/**
 * ── THE AUTH SCREENS, ON THE SITE'S OWN VOCABULARY (owner, 20/08/2026) ──────────────────────
 * *"completely redesign the login and signup page, make it fit the vibe of the website and the
 * landing page, and use the colours of the website."*
 *
 * The previous pass fixed the COLOUR — it was `red-600` (#DC2626, a signal red) where the brand
 * is #D03B04, so side by side with the homepage the two did not read as the same company. That
 * part was right and it stays.
 *
 * What it got wrong is the thing the owner is now pointing at: **it made dark a SURFACE.**
 *
 * ── HALF THE SCREEN WAS A DARKENED PHOTOGRAPH ───────────────────────────────────────────────
 * The brand panel was `.pt-slab` with the hero image under `bg-black/70` plus a brand gradient on
 * top. At 1536 that is ~768 x 869px — 44% of the viewport — painted near-black. DESIGN_SYSTEM §0.5
 * is unambiguous about this and it is the owner's own constraint, quoted there:
 *
 *     "I want something light, and it has a dark mode and a light mode. Keep it white and just
 *      use black for important things."
 *
 * The budget is ~12% of painted area. A 70% black scrim over half the page spends it four times
 * over — and it spends it on a photograph it simultaneously destroys. The source image is a
 * beautifully lit studio shot: five products, warm rim light, an athlete on a bench. Under
 * `bg-black/70` it is a brown smear in which none of that is legible. We were paying 135 KB and
 * half the composition to show nothing.
 *
 * ── SO THE PAGE IS LIGHT AND THE PHOTOGRAPH IS AN OBJECT ────────────────────────────────────
 * Which is exactly what the landing page does, and is the pattern this screen should have copied
 * in the first place. On the homepage the hero is not a background — it is a contained, rounded,
 * hairline-bordered card sitting on white, beside a white best-sellers panel. The category tiles
 * are the same move: dark photograph, rounded, with a light caption row under it.
 *
 * So here: the brand column is `bg-canvas`, and the photograph is a `rounded-2xl` card in it,
 * UNDARKENED. The dark is still there — it is simply an object with edges instead of a curtain,
 * and now you can see the products in it. Painted-dark area at 1536 drops from ~44% to ~9%.
 *
 * ── AND THE TRUST ROWS ARE THE HOMEPAGE'S TRUST STRIP ───────────────────────────────────────
 * They were a bare `<ul>` of icon + two lines. The homepage states the same three facts in a
 * bordered, hairline-divided strip — the site's most recognisable small component. Reusing that
 * shape is most of what "fit the vibe" means: a returning customer has already read this row on
 * the homepage, and meeting it again on the signup screen is continuity rather than decoration.
 *
 * ── FIGURE ON GROUND, WHICH IS WHY THE COLUMNS ARE THESE WAY ROUND ──────────────────────────
 * `--c-canvas` and `--c-elevated` are BOTH #FFFFFF in light mode. So a white card needs a
 * non-white field or it disappears, leaving only its hairline. The form column is therefore
 * `bg-sunken` (warm sand) with a `bg-elevated` card on it, and the brand column is `bg-canvas`.
 * That also makes the two halves the site's own canvas <-> sunken alternation, turned on its side,
 * with a hairline on the seam — §0.5's rule that no two adjacent surfaces may match.
 *
 * ── MOBILE ──────────────────────────────────────────────────────────────────────────────────
 * `min-h-dvh`, not `min-h-screen`: on iOS Safari `100vh` includes the browser chrome, so the old
 * shell was ~90px taller than the visible viewport and every auth screen started life scrolled.
 * The brand column is `hidden lg:flex`, so a phone never requests the 135 KB photograph; it gets
 * the same trust strip under the card instead. Layout holds to 320px.
 *
 * `.pt-no-chrome` is read by globals.css to drop the body's tab-bar reserve — these routes render
 * no tab bar, and the reserve was leaving a ~90px strip of canvas below the fold.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────
 * ── THIRD PASS (owner, 20/08/2026): "IT LOOKS AI GENERATED" ─────────────────────────
 *
 * *"the design that you've made for the login and the sign up page looks like AI generated …
 * make the best UX/UI, showing on the login and the sign up that if they log in they will get
 * benefits."*
 *
 * The second pass fixed the SURFACE problem and left the CONTENT problem untouched, and the
 * content problem is the one that reads as machine-made. Measured, on the screenshot the owner
 * sent back:
 *
 *   - The panel is ~1,100px tall and **not one pixel of it is about having an account.** The
 *     headline is the homepage's headline. The paragraph is the homepage's paragraph. And all
 *     three trust facts — authentique, livraison 24–72h, paiement à la livraison — are equally
 *     true for a guest who never registers. The panel argues for the SHOP, on the one screen
 *     whose entire job is to argue for the ACCOUNT.
 *   - ~430px of that height is a decorative photograph carrying `alt=""`. It is the homepage
 *     hero, reused. Generic imagery filling space that has nothing to say is precisely the tell
 *     the owner is naming; the fix is not a better photograph, it is having something to say.
 *
 * ── AND THIS SHOP HAS SOMETHING TO SAY, IT JUST NEVER SAID IT ───────────────────────
 * There is a complete loyalty programme behind the login: a points ledger, a 5% earn rate, a
 * redemption slider in checkout, a balance and a full history. It has been reachable only from
 * the third tab of `/account` — that is, only to somebody who had already registered. The one
 * concrete, quantified, guest-unavailable reason to make an account was the one thing the signup
 * screen did not mention.
 *
 * So the photograph is gone and the benefits take its place: four rows, in the trust strip's own
 * shape, each of which had to be **verified true against the backend before it could be written
 * here**. Two candidates were cut for failing that test — favourites (`FavoritesContext` is
 * localStorage-only, there is no favourites row in the database, so an account syncs nothing) and
 * a saved address book (`AddressSelector` is a gouvernorat picker, not storage). What survived is
 * points, order history, prefilled checkout details and verified reviews. See ACCOUNT_BENEFITS.
 *
 * The trust strip stays, demoted and compact, at the bottom of the column: those three facts are
 * still why somebody trusts the shop enough to type an email, they are simply not the argument
 * for the account and no longer occupy the position of one.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * ── FOURTH PASS (owner, 21/08/2026): "NOT SCROLLING, FIT THE FULL HEIGHT, MINIMALISTIC" ─────
 *
 * Measured before touching anything (`measure-auth --report`, which this pass added):
 *
 *        390x844   /login 1000px (156 over) · /register 1351px (507 over)
 *        390x667   /login 1000px (333 over) · /register 1351px (684 over)
 *
 * Every auth screen on this site scrolled, on every phone, and /register scrolled by more than
 * half a screen. That is not a cosmetic problem: a signup form that scrolls puts its own submit
 * button below the fold, and the customer's judgement of "how long will this take" is made from
 * what is on screen when the page lands.
 *
 * The height went, in descending order of how much it was worth:
 *
 *   ~320px  the two stacked lists under the card on mobile. The BENEFIT survives as one line —
 *           `MobileBenefitLine` — because it is the argument for the account and the third pass
 *           put it there for a reason. Four rows of it was the mistake, not the message.
 *   ~110px  the confirm-password field (see RegisterPage — the reveal toggle already does its job)
 *    ~60px  field metrics: 48px inputs to 44, 13px labels to 12, space-y-4 to space-y-3
 *    ~40px  the title block: 26px to 22px, tighter kicker, one-line subtitles
 *    ~30px  card padding and the header row
 *
 * On DESKTOP the trust strip becomes a single inline row rather than a three-row box. Same three
 * facts, ~100px less, and "minimalistic" is the owner's word for what a bordered box of restated
 * shop policy was not.
 */

const TRUST: Array<{ Icon: LucideIcon; label: string; hint: string }> = [
  { Icon: ShieldCheck, label: '100% authentique', hint: 'Importé et distribué conformément aux autorisations' },
  { Icon: Truck, label: 'Livraison 24–72h', hint: 'Partout en Tunisie, offerte dès 300 DT' },
  { Icon: CreditCard, label: 'Paiement à la livraison', hint: 'Vous réglez le livreur, à la réception' },
];

/**
 * ── WHAT AN ACCOUNT ACTUALLY GIVES YOU ──────────────────────────────────────────
 *
 * Every row here is a claim made to somebody who has not signed up yet, so every row was checked
 * against the code that would have to honour it:
 *
 *   Points      PointsService::EARN_RATE = 1/DT, REDEEM_POINTS_PER_DT = 20 → 5%. Credited on the
 *               transition to `livree`, which is why the row says "livrée" and not "payée".
 *   Commandes   `/account` → OrdersSection, backed by the orders endpoint. Guests get an email and
 *               nothing else.
 *   Coordonnées CheckoutPage seeds livraison_nom / prenom / email from `user` on mount.
 *   Avis        ClientController requires an authenticated user to publish a review, and a review
 *               carrying a commande_id is what earns the "Achat vérifié" mark on the product page.
 *
 * Two rows that would have been easy to write and are FALSE here, recorded so nobody adds them
 * back: favourites do not sync (localStorage, no table), and there is no saved address book.
 *
 * The numbers come from `util/loyaltyPoints.ts` rather than being typed into the sentence. If the
 * economy is ever retuned, the promise on the signup screen moves with it instead of quietly
 * becoming a lie.
 */
const ACCOUNT_BENEFITS: Array<{ Icon: LucideIcon; label: string; hint: string }> = [
  {
    Icon: Coins,
    label: `${CASHBACK_PERCENT}% en points de fidélité`,
    hint: `1 point par dinar, ${REDEEM_POINTS_PER_DT} points = 1 DT de remise. Crédités à la livraison.`,
  },
  {
    Icon: PackageCheck,
    label: 'Vos commandes au même endroit',
    hint: 'Historique complet, statut et détail de chaque commande.',
  },
  {
    Icon: Zap,
    label: 'Commande plus rapide',
    hint: 'Vos coordonnées sont pré-remplies au moment de commander.',
  },
  {
    Icon: Star,
    label: 'Donnez votre avis',
    hint: 'Les avis rattachés à une commande portent la mention « Achat vérifié ».',
  },
];

/**
 * The benefits, in the same bordered, hairline-divided box the trust strip uses.
 *
 * Deliberately NOT a new visual pattern. This screen's problem was never that it lacked a device —
 * it is the site's most recognisable small component, and reusing it here means the panel reads as
 * this shop rather than as a template. The only difference from `TrustStrip` is the accent plate
 * behind each glyph, which is what separates "here is what you get" from "here is who we are".
 */
function BenefitList() {
  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas">
      {ACCOUNT_BENEFITS.map(({ Icon, label, hint }) => (
        <li key={label} className="flex items-start gap-3 px-4 py-3.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="min-w-0 pt-0.5">
            <span className="block text-[13px] font-bold uppercase tracking-[0.04em] text-ink-1">{label}</span>
            <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">{hint}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The three facts, in the homepage trust strip's shape: one bordered box, hairline-divided rows,
 * an 18px brand glyph, an uppercase label and a quiet hint.
 *
 * `hint` is dropped on the phone (`compact`) — under a 5-field signup form, three second lines are
 * 60px of reassurance nobody scrolls to. The labels alone carry it.
 */
function TrustStrip() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
      {TRUST.map(({ Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <Icon className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
          <span className="text-[12px] font-semibold text-ink-2">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The account's argument, on a phone, in one line.
 *
 * The third pass gave the phone a four-row benefit list and a three-row trust strip under the
 * form — ~320px of it, which is why /register was 507px too tall. Both are gone from mobile and
 * this is what replaced them: the same claim, from the same constant, at 1/12th the height.
 *
 * ABOVE the card, not below. Below the card it was under the fold on every phone measured, which
 * is a strange place to put the reason somebody should fill in the form above it.
 */
function MobileBenefitLine() {
  return (
    /*
       `[@media(max-height:700px)]:hidden` — a HEIGHT query, not a width one, because the constraint
       is vertical. On an iPhone SE (667px tall) /register was 28px over with this line present and
       fits without it; on every taller phone it stays. Removing it everywhere to satisfy the
       smallest screen would delete the account's argument from the 81% of traffic that has room
       for it, and keeping it everywhere would make the shortest screens scroll. The query is the
       honest answer to a genuine trade, and it is the only element on this screen cheap enough to
       be the one that goes.
    */
    <p className="mb-2.5 flex items-center justify-center gap-2 text-[12.5px] leading-snug text-ink-2 lg:hidden [@media(max-height:700px)]:hidden">
      <Coins className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
      <span>
        <span className="font-bold text-ink-1">{CASHBACK_PERCENT}% en points</span> sur chaque
        commande livrée
      </span>
    </p>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div className="pt-no-chrome min-h-dvh bg-sunken lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── THE BRAND COLUMN — DESKTOP ONLY ──────────────────────────────────────────────── */}
      <aside className="hidden border-e border-hairline bg-canvas lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-10 xl:p-12">
        <Link
          href="/"
          /* `min-h-[44px]` on a link whose only child is a 40px image. Without it this is a 40px
             target — caught by measure-auth, not by looking at it, which is the entire argument
             for that script: the logo LOOKS like a comfortable click at any zoom level. */
          className="flex min-h-[44px] w-fit items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Protein.tn — Accueil"
        >
          <Image
            src={headerLogoUrl}
            alt="Protein.tn"
            width={230}
            height={75}
            sizes="200px"
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="max-w-xl">
          <span className="mb-3 inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <span className="h-px w-5 bg-brand" aria-hidden="true" />
            Espace client
          </span>
          {/*
              The headline is a NUMBER, and it is the number this screen is selling.

              It was "La nutrition sportive n°1 en Tunisie" — the homepage's headline, on a page
              nobody reaches without already having chosen the shop. A visitor here has a cart or
              an order; what they have not decided is whether to type an email address. So the
              headline answers that question instead, with the one quantified thing an account
              gives that a guest checkout does not.

              `font-display` already carries wdth 82 from globals.css — `font-compressed` beside it
              is redundant. Same treatment as every section title on the site.
          */}
          <h2 className="font-display text-[38px] font-bold uppercase leading-[0.95] tracking-tight text-ink-1 xl:text-[46px]">
            Votre compte vous rapporte <span className="text-brand">{CASHBACK_PERCENT}%</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
            Gratuit, en une minute. Vos points sont crédités dès que la commande est livrée, et se
            déduisent de la suivante.
          </p>

          <div className="mt-8">
            <BenefitList />
          </div>

          {/*
              The shop's three facts, kept and demoted.

              They are still the reason somebody trusts this site enough to type an email — but
              they are true for a guest too, so they cannot be the argument for registering and no
              longer sit where that argument belongs. `compact` drops the second lines: under the
              benefit list, which now carries the explanatory prose, three more hint rows were
              120px of text at the bottom of a column nobody reads to the end of.
          */}
          <div className="mt-6">
            <TrustStrip />
          </div>
        </div>

        <p className="text-xs text-ink-3">© Protein.tn — SOBITAS, Sousse, Tunisie</p>
      </aside>

      {/* ── THE FORM COLUMN ──────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-dvh flex-col">
        {/* The escape hatch was `absolute left-5 top-5`, so on a short phone in landscape it
            overlapped the form it was meant to sit above. It is a real row now, in flow. */}
        <div
          data-auth-header=""
          className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-4 lg:px-10"
        >
          <Link
            href="/"
            className="group -ms-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Retour à la boutique</span>
            <span className="sm:hidden">Boutique</span>
          </Link>
          {/* `min-h-[44px]` on a link that wraps nothing but a 32px image: without it the logo is a
              32px target, and it is one of only two controls on the screen before the form. */}
          <Link
            href="/"
            className="flex min-h-[44px] items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:hidden"
            aria-label="Protein.tn — Accueil"
          >
            <Image
              src={headerLogoUrl}
              alt="Protein.tn"
              width={230}
              height={75}
              sizes="140px"
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* `data-auth-*` so the fit guard can measure the CONTENT height rather than the document
            height. `documentElement.scrollHeight` is never smaller than the viewport, so a page
            that fits reports exactly the viewport and tells you nothing about how much slack is
            left — which matters here, because the Google block is behind an env flag and is
            absent from every local measurement. See measure-auth. */}
        <div
          data-auth-body=""
          className="flex flex-1 items-center justify-center px-4 pb-5 pt-1 sm:px-6 sm:pb-10 lg:px-10"
        >
          <div data-auth-card="" className="w-full max-w-[27rem]">
            <MobileBenefitLine />
            <div className="rounded-2xl border border-hairline bg-elevated p-3.5 shadow-card sm:p-8">
              {children}
            </div>

            {/*
              The two compact lists that used to sit here are gone — see the header note. They were
              ~320px on a screen that was already 507px too tall, and they were below the fold on
              every phone measured, so they were paying for themselves in scroll and being read by
              nobody. `MobileBenefitLine` above the card carries the one claim that mattered.
            */}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuthCardHeaderProps {
  /** Brand wordmark above the kicker. The shell already shows one on phones, so this is off by
   *  default — it was `showLogo` on two of the four screens and produced two logos on mobile. */
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  /**
   * Hide the subtitle below `sm`.
   *
   * Opt-in per screen, and NOT a blanket rule, because the four auth screens use the subtitle for
   * two different jobs. On /login and /register it is promotional — and on a phone it now repeats
   * what `MobileBenefitLine` says directly above the card. On /forgot-password and
   * /reset-password it is an INSTRUCTION ("Indiquez l'adresse e-mail de votre compte…", "Ce lien
   * est incomplet ou a déjà été utilisé…"), and hiding it would leave a phone looking at a form
   * with no explanation of what the link it just clicked did.
   *
   * ~34px, which is most of what /register was still over by on an iPhone SE.
   */
  subtitleDesktopOnly?: boolean;
}

/** Kicker + display-face title for an auth form. */
export function AuthCardHeader({ kicker, title, subtitle, subtitleDesktopOnly }: AuthCardHeaderProps) {
  return (
    <div className="mb-3 sm:mb-6">
      {/* The kicker is `hidden sm:inline-flex` on every screen. "CRÉER UN COMPTE" sitting directly
          above an H1 reading "REJOIGNEZ-NOUS" is the same sentence twice, and on a phone it cost
          ~22px to say it — the definition of what "minimalistic" was asking to remove. */}
      {kicker && (
        <span className="mb-1.5 hidden items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brand sm:mb-3 sm:inline-flex">
          <span className="h-px w-5 bg-brand" aria-hidden="true" />
          {kicker}
        </span>
      )}
      {/* 22px on a phone, 30px from `sm`. The 26px it carried was a desktop size on a screen where
          every pixel above the first field is a pixel of the form pushed under the fold. */}
      <h1 className="font-display text-[22px] font-bold uppercase leading-tight tracking-tight text-ink-1 sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            'mt-1.5 text-[13px] leading-snug text-ink-2 sm:mt-2 sm:text-sm sm:leading-relaxed',
            subtitleDesktopOnly && 'hidden sm:block'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface AuthFieldProps extends Omit<React.ComponentProps<'input'>, 'id'> {
  label: string;
  Icon: LucideIcon;
  /** Rendered on the label row, right-aligned — the "Mot de passe oublié ?" link. */
  action?: ReactNode;
  /** Help text under the field. */
  hint?: string;
  /** Adds a show/hide toggle and makes the input a password field. */
  reveal?: boolean;
}

/**
 * One field: label, leading icon, input, optional hint.
 *
 * `useId` rather than a hand-passed id — the four screens between them had `email` declared on
 * three different pages, which is only invisible because they never render together.
 *
 * The reveal toggle is new. A password field with no way to see what you typed, on a phone
 * keyboard, is the single most common reason a signup is abandoned twice.
 */
export function AuthField({ label, Icon, action, hint, reveal = false, className, ...props }: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [shown, setShown] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[12px] font-semibold text-ink-1 sm:text-[13px]">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute start-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
          strokeWidth={2}
          aria-hidden="true"
        />
        <Input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          {...props}
          type={reveal ? (shown ? 'text' : 'password') : props.type}
          className={cn(
            /* 44px on a phone — the target minimum exactly, not a pixel more — and 48 from `sm`.
               Five fields at 48 was 20px of pure height on the screen that was furthest over. */
            'h-11 rounded-xl border-hairline bg-canvas ps-10 text-ink-1 placeholder:text-ink-3 sm:h-12',
            'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0',
            reveal && 'pe-11',
            className
          )}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            /* 44px target, but drawn as a 36px glyph box so it does not crowd a 48px field. */
            /* h-11 on EVERY width. This was briefly h-10 to buy 4px back on a short phone, and
               measure-auth failed it across 12 combinations within the minute: 44px is a hard
               floor, not a budget line, and the show/hide toggle is now load-bearing — the
               confirm-password field was removed on the grounds that this control replaces it. */
            className="absolute end-1 top-1/2 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {shown ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs leading-snug text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The primary action. A plain <button>, not the shadcn `Button`: every call site was overriding
 * `size`, height, colour and typography anyway, which is five props to reach the same place.
 */
export function AuthSubmit({
  loading,
  loadingLabel,
  children,
  ...props
}: React.ComponentProps<'button'> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4',
        /* The submit stays 48px on every screen. It is the one control on the page that must never
           be the thing that gets smaller, and it is the target a thumb reaches for last. */
        'font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand',
        /* Named properties, not `transition-all` — that would also animate the focus ring's
           colour, which should appear instantly. The 0.99 press is the only motion on this
           screen and it is what makes a 12px-tall colour change read as a button being pressed
           rather than as a repaint. */
        'transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        props.className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? 'Un instant…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** "ou" rule, between the password form and the Google button. */
export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-rule" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/** The "already have an account?" line under the card. */
export function AuthAlt({ question, href, cta }: { question: string; href: string; cta: string }) {
  return (
    <p className="mt-3 text-center text-[13px] text-ink-2 sm:mt-6 sm:text-sm">
      {question}{' '}
      <Link
        href={href}
        className="rounded font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {cta}
      </Link>
    </p>
  );
}
