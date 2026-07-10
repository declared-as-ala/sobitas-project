import type { Config } from "tailwindcss"
import type { PluginUtils } from "tailwindcss/types/config"
import typography from "@tailwindcss/typography"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
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
      }),
    },
  },
  plugins: [typography],
}

export default config
