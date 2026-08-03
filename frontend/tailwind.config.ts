import type { Config } from "tailwindcss"
import type { PluginUtils } from "tailwindcss/types/config"
import typography from "@tailwindcss/typography"

const config: Config = {
  darkMode: ["class"],
  /**
   * Scan ALL of src, not just app/ and pages/.
   *
   * This previously listed only ./src/pages and ./src/app, so any Tailwind class defined
   * outside those two directories was silently purged from the CSS — no build error, no
   * warning, just a missing rule. That is exactly what broke the product cards: the shared
   * image-frame constants live in src/util/productCardFrame.ts, so `aspect-[4/5]` never made
   * it into the stylesheet, the image box collapsed to zero height and the title overlapped
   * the badges.
   *
   * Keep this glob broad. Narrowing it re-arms the same trap for src/util, src/contexts,
   * src/hooks and src/lib, which all legitimately hold className strings.
   */
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Athletic condensed display face for hero/section titles, prices, badges, countdowns.
        // Body/UI stays `sans` (Inter). Use via the `font-display` utility.
        display: [
          "var(--font-display)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
        // Poppins — the GPT product-card typeface. Scoped via `font-poppins` (card-first rollout).
        poppins: [
          "var(--font-poppins)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        /** Page / section titles */
        display: ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        /** Hero sublines, large intros */
        lead: ["1.125rem", { lineHeight: "1.55", fontWeight: "400" }],
        /** Dense UI (filters, meta) */
        ui: ["0.875rem", { lineHeight: "1.35", fontWeight: "500" }],
        /** Captions, badges, legal */
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      colors: {
        /**
         * BRAND ORANGE — the one accent, matched to the Protein.tn logo (#F8480C).
         *
         * The palette KEY stays `red` on purpose. ~40 files and ~300 call sites already say
         * `bg-red-600` / `text-red-400`; re-pointing the VALUES re-skins every one of them at
         * once with zero file churn and no half-migrated period. (Yes, the utility is named
         * "red" while rendering orange — that is the intentional cost of a zero-churn re-skin;
         * new code should prefer the semantic `brand` tokens below.)
         *
         * TWO WORKING SHADES:
         *   500 = #F8480C — the EXACT logo orange, for graphical accents (badges, icons, the
         *         kicker rule). Bright; not for white body text on top.
         *   600 = #D53B04 — the ACTION shade (buttons, price, links). Deepened from the logo
         *         orange so white-on-600 AND 600-on-white both clear WCAG AA 4.5:1 (measured
         *         4.69:1). An earlier value #DA3E06 sat at 4.49 — a hair under, which automated
         *         audits flag — so it was darkened one step. The raw logo orange (#F8480C, 500)
         *         is ≈3.5:1 on white and is for GRAPHICAL accents only, never white body text.
         *
         * Static hex (not CSS vars) on purpose: existing code writes its own dark variants
         * (`text-red-600 dark:text-red-400`), so the ramp must NOT auto-flip per theme.
         */
        red: {
          50: "#FFF3ED",
          100: "#FFE4D3",
          200: "#FFC6A4",
          300: "#FF9E64",
          400: "#FB7333",
          500: "#F8480C",
          600: "#D53B04",
          700: "#B63304",
          800: "#92290A",
          900: "#78250E",
          950: "#421105",
        },
        /** Same ramp, brand-named, for new code. DEFAULT/hover are theme-aware. */
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          hover: "rgb(var(--c-brand-hover) / <alpha-value>)",
          50: "#FFF3ED",
          100: "#FFE4D3",
          200: "#FFC6A4",
          300: "#FF9E64",
          400: "#FB7333",
          500: "#F8480C",
          600: "#D53B04",
          700: "#B63304",
          800: "#92290A",
          900: "#78250E",
          950: "#421105",
        },
        /** Theme-aware surfaces + ink. Prefer these over bg-white / text-gray-900. */
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        sunken: "rgb(var(--c-sunken) / <alpha-value>)",
        hairline: "rgb(var(--c-hairline) / <alpha-value>)",
        /**
         * TWO boundary weights, because they do different jobs and one value cannot do both.
         *
         *   hairline      a border on a component that ALSO has its own fill (card, input,
         *                 chip). Decorative, so no contrast floor applies.
         *   rule          a band seam or a cell divider that sits alongside a fill change.
         *   rule-strong   a divider that is the SOLE boundary between two otherwise identical
         *                 surfaces — the brand wall's `gap-px` matrix. WCAG 1.4.11 applies:
         *                 measured 3.34:1 on white, 4.10:1 on the dark plate.
         *
         * Using `hairline` where `rule-strong` is required is the failure mode this split exists
         * to prevent: it looks fine and measures 1.26:1.
         */
        rule: "rgb(var(--c-rule) / <alpha-value>)",
        "rule-strong": "rgb(var(--c-rule-strong) / <alpha-value>)",
        /**
         * Stock semantics, not decoration. These replaced #22C55E (2.28:1 on white) and #F59E0B
         * (2.15:1) — colours that read as "status" but carried none. They are band-aware, so the
         * same `text-ok` renders #15803D on a white card and #22C55E on the black slab.
         */
        ok: "rgb(var(--c-ok) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        /** Focus ring colour, band-aware. Never put a scope class on a focusable element: the
         *  ring resolves in the element's own scope but paints on the PARENT band's surface. */
        focus: "rgb(var(--c-focus) / <alpha-value>)",
        /**
         * The foreground that sits ON the accent — `bg-brand text-on-brand`.
         *
         * NOT optional and NOT a constant. In light theme it is white on #D53B04 (4.71:1). In the
         * slab scope and in dark theme the accent lightens to #FF8A4C, where white measures
         * 2.34:1 and fails AA outright; `--c-on-brand` flips to #0A0A0B there (8.47:1).
         *
         * This entry was missing for one commit while eight call sites already used
         * `text-on-brand`. Tailwind emits nothing for an undefined colour — no error, no warning —
         * so every one of those buttons silently INHERITED its band's body ink instead. On the
         * near-black header that rendered the pack CTA's label at 1.37:1. Caught by the automated
         * contrast sweep, not by looking at it, which is the whole argument for running the sweep:
         * a missing utility is invisible in review and invisible in the build.
         */
        "on-brand": "rgb(var(--c-on-brand) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--c-ink-1) / <alpha-value>)",
          1: "rgb(var(--c-ink-1) / <alpha-value>)",
          2: "rgb(var(--c-ink-2) / <alpha-value>)",
          3: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        /**
         * THE SHADCN SEMANTIC TOKENS — repaired.
         *
         * These were declared as `hsl(var(--background))` while styles/theme.css defined
         * `--background: #ffffff`, `--foreground: oklch(...)`, `--border: rgba(0,0,0,.1)`,
         * `--input: transparent`. `hsl(#ffffff)` is not valid CSS, so the browser DROPPED every
         * one of these declarations. Confirmed in the built stylesheet, where the emitted rule
         * was `.bg-primary{background-color:hsl(var(--primary))}` with no `--tw-bg-opacity`
         * alongside it — which also proves the opacity modifiers (`hover:bg-primary/90`,
         * `ring-ring/50`, `dark:bg-input/30`) were dead, not just the base colours.
         *
         * What that silently cost, live, for months:
         *   globals.css `body { @apply bg-background text-foreground }`  → set NOTHING. The page
         *     was white because that is the user-agent default, and dark mode had no body colour.
         *   globals.css `* { @apply border-border outline-ring/50 }`     → set NOTHING, so bare
         *     borders fell back to preflight #e5e7eb — light grey on dark surfaces.
         *   ui/button.tsx `default: "bg-primary text-primary-foreground"` → a TRANSPARENT button.
         *
         * THE REPAIR: point these at the `--c-*` tokens in styles/tokens.css, which are real
         * space-separated RGB triplets that already work. One source of truth instead of two
         * parallel namespaces drifting apart — which is what caused this in the first place.
         * Using `rgb(... / <alpha-value>)` also makes the opacity modifiers function for the
         * first time.
         *
         * The alternative — unwrapping hsl() and hand-converting ~30 oklch/hex values in
         * theme.css to HSL triplets — was rejected: it keeps two namespaces alive forever, and
         * shadcn's cool-slate defaults visibly fight the warm brand neutral (--c-hairline).
         *
         * `--primary` is now the BRAND ACCENT, so `variant="default"` is the brand CTA and the
         * three unused `brand*` Button variants become redundant (removed in a follow-up commit).
         *
         * theme.css's shadcn block is now vestigial. Left in place deliberately: deleting it in
         * the same commit as the flip would make a revert ambiguous.
         */
        background: "rgb(var(--c-canvas) / <alpha-value>)",
        foreground: "rgb(var(--c-ink-1) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--c-elevated) / <alpha-value>)",
          foreground: "rgb(var(--c-ink-1) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--c-elevated) / <alpha-value>)",
          foreground: "rgb(var(--c-ink-1) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          // NOT white — see --c-on-brand in tokens.css. White on the dark-mode accent is ~2.2:1.
          foreground: "rgb(var(--c-on-brand) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--c-sunken) / <alpha-value>)",
          foreground: "rgb(var(--c-ink-1) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--c-sunken) / <alpha-value>)",
          foreground: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        accent: {
          // The shadcn `accent` is a HOVER SURFACE, not the brand accent — it is what
          // `variant="ghost"` and `variant="outline"` tint on hover. Pointing it at the brand
          // orange would flood every quiet control with colour on hover.
          DEFAULT: "rgb(var(--c-sunken) / <alpha-value>)",
          foreground: "rgb(var(--c-ink-1) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--c-danger) / <alpha-value>)",
          foreground: "rgb(var(--c-on-brand) / <alpha-value>)",
        },
        border: "rgb(var(--c-hairline) / <alpha-value>)",
        input: "rgb(var(--c-hairline) / <alpha-value>)",
        ring: "rgb(var(--c-brand) / <alpha-value>)",
        // `chart.*` deleted with ui/chart.tsx and recharts — nothing references these utilities.
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /** Retires the arbitrary `shadow-[0_2px_12px_rgba(0,0,0,0.08)]` string that is
       *  copy-pasted across ProductCard / ProductCardSkeleton / FlashProductCard. */
      boxShadow: {
        card: "0 2px 12px rgb(0 0 0 / 0.08)",
        "card-hover": "0 8px 30px rgb(0 0 0 / 0.16)",
      },
      /** `pb-tabbar` / `bottom-tabbar` — see --tabbar-h in styles/tokens.css.
       *  Every fixed-bottom element offsets against this one variable. */
      spacing: {
        tabbar: "var(--tabbar-h)",
        "tabbar-raise": "var(--tabbar-raise)",
      },
      maxWidth: {
        /**
         * THE page container. Every full-width band on the site — header, hero, category rail,
         * every product section, footer — must use `max-w-site`, because if two of them disagree
         * their edges visibly step in and out down the page. That is exactly the bug that shipped
         * when the hero was built at a bespoke 1560 while everything else sat at 1400.
         *
         * 1600, raised from a hardcoded 1400: on a 1536px laptop viewport (a 1920 screen at 125%
         * Windows scaling, which is what the owner uses) 1400 left a visible dead margin either
         * side of the hero. At 1600 that class of display fills edge to edge, and a true 1920px
         * viewport keeps a 160px gutter rather than 260px.
         *
         * Change it HERE and nowhere else.
         */
        site: "1600px",
      },
      /** Named layers so stacking is decided once, not guessed per component.
       *
       *  sticky-cta < tabbar < header/overlay, in that order and for a reason:
       *
       *  - `sticky-cta` is PAGE chrome that stacks on top of the tab bar (PDP add-to-cart and
       *    its skeleton twin, the cart CTA, the install banner). These used to be z-50 and
       *    z-[9999], which put them ABOVE the tab bar — so on every product page they painted
       *    over the raised Boutique tile that protrudes 16px out of the bar, and the site's
       *    primary navigation target looked half-buried. They pad by `--tabbar-raise` so the
       *    tile overlaps their surface, never their controls.
       *  - `tabbar` is persistent APP chrome and outranks page chrome.
       *  - Both stay below the shadcn Sheet overlay (z-50) and Drawer (z-50), which are meant
       *    to cover the bar. */
      zIndex: {
        "sticky-cta": "30",
        tabbar: "40",
        header: "50",
      },
      typography: ({ theme }: PluginUtils) => ({
        DEFAULT: {
          css: {
            maxWidth: "70ch",
            lineHeight: "1.65",
            fontSize: "1rem",
            h1: {
              fontWeight: "600",
              letterSpacing: "-0.02em",
              lineHeight: "1.2",
              marginTop: "0",
              marginBottom: "0.65em",
            },
            h2: {
              fontWeight: "600",
              letterSpacing: "-0.015em",
              lineHeight: "1.25",
              marginTop: "1.75em",
              marginBottom: "0.65em",
            },
            h3: {
              fontWeight: "600",
              lineHeight: "1.3",
              marginTop: "1.5em",
              marginBottom: "0.5em",
            },
            h4: {
              fontWeight: "600",
              lineHeight: "1.35",
              marginTop: "1.25em",
              marginBottom: "0.5em",
            },
            p: {
              marginTop: "0.75em",
              marginBottom: "0.75em",
            },
            a: {
              color: theme("colors.red.600"),
              fontWeight: "500",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              "&:hover": {
                color: theme("colors.red.700"),
              },
            },
            "ul > li, ol > li": {
              paddingInlineStart: "0.35em",
            },
            code: {
              fontWeight: "500",
              fontSize: "0.9em",
            },
            pre: {
              fontSize: "0.875em",
            },
          },
        },
        invert: {
          css: {
            a: {
              color: theme("colors.red.400"),
              "&:hover": {
                color: theme("colors.red.300"),
              },
            },
          },
        },
        /**
         * The `prose-red` modifier (used on the category SEO landings) ships its OWN
         * hardcoded #dc2626 from the typography plugin's palette — it does not read
         * theme.colors.red, so overriding the red ramp alone leaves those pages on the
         * old red while the rest of the site moves to brand red. Re-point it explicitly.
         */
        red: {
          css: {
            "--tw-prose-links": theme("colors.red.600"),
            "--tw-prose-invert-links": theme("colors.red.400"),
          },
        },
      }),
    },
  },
  plugins: [typography],
}

export default config
