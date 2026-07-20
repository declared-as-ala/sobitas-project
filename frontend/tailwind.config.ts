import type { Config } from "tailwindcss"
import type { PluginUtils } from "tailwindcss/types/config"
import typography from "@tailwindcss/typography"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
         * BRAND RED — the one accent (DESIGN_SYSTEM.md v3 §2).
         *
         * `red` is deliberately OVERRIDDEN rather than left alone. ~40 files already say
         * `bg-red-600` / `text-red-400`, and re-pointing the palette re-skins every one of
         * them at once with zero file churn and no half-migrated period. The ramp is
         * luminance-matched to Tailwind's stock red (600 sits at relative luminance 0.1676,
         * identical to #dc2626), so every existing contrast ratio is preserved — this is a
         * pure hue shift, not a brightness change.
         *
         * Static hex (not CSS vars) on purpose: existing code writes its own dark variants
         * (`text-red-600 dark:text-red-400`), so the ramp must NOT auto-flip per theme.
         * New code should prefer the theme-aware `brand` / `brand-hover` below.
         */
        red: {
          50: "#FFF1F1",
          100: "#FFDFDF",
          200: "#FFC6C6",
          300: "#FF9D9D",
          400: "#FA6B6B",
          500: "#F03B3F",
          600: "#E01B24",
          700: "#BC131B",
          800: "#9A1419",
          900: "#7F171B",
          950: "#450809",
        },
        /** Same ramp, brand-named, for new code. DEFAULT/hover are theme-aware. */
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          hover: "rgb(var(--c-brand-hover) / <alpha-value>)",
          50: "#FFF1F1",
          100: "#FFDFDF",
          200: "#FFC6C6",
          300: "#FF9D9D",
          400: "#FA6B6B",
          500: "#F03B3F",
          600: "#E01B24",
          700: "#BC131B",
          800: "#9A1419",
          900: "#7F171B",
          950: "#450809",
        },
        /** Theme-aware surfaces + ink. Prefer these over bg-white / text-gray-900. */
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        sunken: "rgb(var(--c-sunken) / <alpha-value>)",
        hairline: "rgb(var(--c-hairline) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--c-ink-1) / <alpha-value>)",
          1: "rgb(var(--c-ink-1) / <alpha-value>)",
          2: "rgb(var(--c-ink-2) / <alpha-value>)",
          3: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
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
      },
      /** Named layers so stacking is decided once, not guessed per component.
       *  Must stay below the shadcn Sheet overlay (z-50) and Drawer (z-50). */
      zIndex: {
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
