# B2B Platform & Partner Dashboards

> Most of this is already built and none of it is visible. That is the finding that should drive
> the next quarter.

## 1. What exists today

A complete affiliate/partner system, in production, that no coach or gym owner has ever been sold:

| Piece | Detail |
|---|---|
| Models | `Partner`, `PartnerCode`, `PartnerCommissionTransaction`, `PartnerPayout`, `PartnerTransaction` |
| Ledger | **Append-only.** Balance is computed (`confirmed − paid − reversed`), never stored on the model. Correct by construction. |
| Trigger | `CommandeObserver` fires on status `expidee`; reverses on `annuler` |
| Idempotency | One `earn`, one `redeem`, one `reversal` per order — re-saving the same status creates nothing |
| Self-service panel | A second Filament panel at `/partner`, own login, scoped queries, 4 pages |
| Isolation | A partner cannot see other partners, other clients' orders, products, stock or invoices |
| Payouts | Create → *Marquer payé* → ledger debit, with bank/RIB fields on the partner |
| Loyalty | QR cards (`PROT-XXXX-XXXX-XXXX`), in-store scan endpoint, checkout redemption with server-side revalidation |

**The commission model is already right.** An append-only ledger with a derived balance is what you
would design from scratch for money, and it is the part that is expensive to retrofit. The gap is
entirely commercial and presentational.

## 2. What is missing

| Gap | Why it matters |
|---|---|
| **No public partner acquisition page** | There is no URL to send a gym owner to. The programme cannot be sold. |
| **No self-serve signup** | A partner today requires an admin to create a `User`, set `role_id = 4` by hand, and link it |
| **Dashboard is Filament's default** | Four KPI cards and tables. Functional; not something a partner shows a colleague |
| **No marketing assets** | No shareable code card, no QR poster, no link generator |
| **Coach ≠ gym ≠ wholesale ≠ influencer** | One `Partner` type with one commission rate. Wholesale needs price lists (which exist: `ProductPriceList`), influencers need attribution windows, gyms need multi-seat |
| **No B2B ordering** | `ProductPriceList` implements per-client pricing and nothing in the storefront uses it |

## 3. The dashboard stack decision

**Where the B2B dashboard lives: a route group in the Next.js app, not Filament.**

| | Filament `/partner` | Next.js `(partner)` route group |
|---|---|---|
| Build speed | Fastest — it exists | Slower initially |
| Design control | Filament's design language | **The Protein.tn design system** |
| Brand coherence | A partner sees a different product | One brand across storefront and dashboard |
| Mobile | Admin-grade responsive | The same tokens and tap-target rules as the storefront |
| Auth | Separate Filament guard | Same Sanctum token as the member app |

**Keep Filament for internal operations** — it is excellent at CRUD, invoicing, POS and stock, and
rebuilding that would be pure waste. **Move partner-facing surfaces to Next.js**, because a partner
is a *customer of the platform*, not an operator of it, and every partner-facing pixel is brand.

### The UI library: shadcn/ui — the one already installed

This is deliberately **not** a new dependency.

The storefront runs Tailwind v3 + Radix + CVA + `components.json` — that *is* shadcn/ui. After the
token-bridge repair, `bg-primary`, `bg-card`, `border-border` and the rest resolve to the same
`--c-*` tokens the storefront uses. So a dashboard built on shadcn inherits the brand automatically,
in both themes, with no second palette to maintain.

Adding Tremor, Chakra, MUI or Ant Design would each mean a **second component vocabulary and a
second source of design truth** — precisely the condition that produced 5,788 lint violations and a
severed token bridge in the first place.

**Charts: Recharts, scoped to the partner route group.**

Recharts was removed in Stage 3 because `ui/chart.tsx` had zero consumers in a storefront with no
dashboard. It comes back here, with two conditions:

1. It is imported **only** inside `app/(partner)/**`, so Next code-splits it and no storefront
   visitor downloads ~400 KB for a page they will never open.
2. All chart code goes through one `components/charts/` module that owns the palette, axis, grid,
   tooltip and legend defaults. Individual pages never configure a chart directly — that is how
   twelve charts end up with twelve styles.

## 4. Chart palette — validated, not chosen by eye

Six categorical slots. Assigned **in fixed order, never cycled**; a seventh series folds into
"Autres" or becomes small multiples.

| Slot | Hex | Note |
|---|---|---|
| 1 | `#D53B04` | brand orange — the existing `brand-600`, so the primary series is always the brand |
| 2 | `#2563EB` | blue |
| 3 | `#B45309` | amber |
| 4 | `#0D9488` | teal |
| 5 | `#C026D3` | fuchsia |
| 6 | `#4D7C0F` | olive |

Validated with the six-check validator against **both** surfaces — identical values pass light and
dark, so there is one palette rather than two:

```
lightness band      PASS   all 6 in range
chroma floor        PASS   all 6 >= 0.1        (nothing reads as gray)
CVD separation      PASS   worst adjacent pair ΔE 13.6 deutan   (target 8)
normal-vision floor PASS   worst adjacent pair ΔE 23.6
contrast vs surface PASS   all 6 >= 3:1
```

Two earlier candidates failed and are recorded so they are not retried: an 8-slot palette put slate
and magenta at **ΔE 2.8 under protanopia** (indistinguishable), and teal `#0F766E` plus slate
`#475569` fell below the chroma floor — they render as gray and stop encoding anything.

**Rules that travel with the palette:**

- **Colour follows the entity, never its rank.** Filtering from six partners to three must not
  repaint the survivors.
- **One y-axis, ever.** Two measures of different scale become two charts or an indexed series —
  never a dual axis.
- **Sequential = one hue light→dark. Diverging = two hues with a neutral gray midpoint.** No
  rainbows, no hue at a diverging midpoint.
- **Status colours are reserved** — good/warning/serious/critical never double as "series 4", and
  always ship with an icon and a label, never colour alone.
- **Text wears ink tokens, not the series colour.** A coloured mark beside a label carries identity;
  the label itself stays `text-ink-*`.
- **Legend whenever there are ≥2 series**, with direct labels at ≤4, so identity is never
  colour-alone. A single-series chart needs no legend — the title names it.

## 5. What the partner dashboard should show

Ordered by what a partner actually opens it to find out.

1. **Solde disponible** — hero number, the one thing they came for. Not a chart.
2. **Ce mois-ci** — commission earned, orders attributed, conversion rate. Stat tiles with sparklines.
3. **Gains dans le temps** — one bar chart, monthly, one series. No legend needed.
4. **Mes codes** — each code with uses, revenue generated, and a copy button. This is the working
   surface, and today it is a plain table.
5. **Mes commandes** — attributed orders, status, commission, date.
6. **Paiements** — payout history plus what is pending.
7. **Assets** — QR poster, shareable card, link generator. Absent today; the cheapest growth lever
   on this list, because it turns each partner into a distribution channel.

## 6. Extending the partner model

The current `Partner` has one type and one rate. The ecosystem needs four shapes, and they differ in
more than a percentage:

| Type | Attribution | Pricing | Needs |
|---|---|---|---|
| **Coach** | promo code | retail | client roster, per-client plans |
| **Gym** | promo code + QR at reception | retail | multi-seat, branded landing page |
| **Influencer** | link + code, **time-boxed attribution window** | retail | per-campaign reporting |
| **Wholesale** | account, not a code | **`ProductPriceList`** (built, unused) | B2B ordering, credit terms, quotes → the existing Devis flow |

Wholesale is the highest-revenue and lowest-effort of the four: per-client price lists, quotations,
BL and Facture TVA **all already exist in Filament**. What is missing is a logged-in ordering surface
that reads the client's price list — not a new commercial system.
