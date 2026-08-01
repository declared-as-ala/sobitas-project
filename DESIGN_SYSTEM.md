# Protein.tn — Brand Design System

The rules that hold across **every** surface we ship: the storefront, the admin panel, print
documents, the mobile app, and anything built later. Deliberately short. Anything that applies to
only one app belongs in that app's own document, not here.

| Surface | Document | Stack |
| --- | --- | --- |
| Storefront (protein.tn) | [`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md) | Next.js 15 · Tailwind v3 · shadcn/Radix |
| Admin (admin.protein.tn) | [`filament/docs/DESIGN_SYSTEM.md`](filament/docs/DESIGN_SYSTEM.md) | Laravel 12 · Filament v4 · Blade |

Both children open by inheriting this file. They are **not** merged into one document on purpose:
the two stacks share a brand but almost no implementation, so a combined doc would be ~80%
irrelevant to whichever person is reading it — which is exactly how documentation rots.

---

## 1. Naming

- **Protein.tn** is the **online brand**. Storefront, marketing, social, packaging artwork,
  customer-facing copy, `sameAs` profiles.
- **SOBITAS** is the **legal and physical entity**. Invoices, Devis, Bons de Livraison, Factures
  TVA, tax identifiers, the registered address, and anything a Tunisian accountant or auditor reads.

Never substitute one for the other. A customer-facing page that says SOBITAS is a bug; an invoice
that says Protein.tn is a compliance problem.

## 2. Colour — one accent

**Orange, and only orange.** Matched to the logo. No second accent — no amber, blue, green or
purple used decoratively.

| Shade | Hex | Job |
| --- | --- | --- |
| `500` | `#F8480C` | The exact logo orange. **Graphical only** — accent rules, icon fills, marks. ~3.5:1 on white, so it must **never** carry text or sit under white text. |
| `600` | `#D53B04` | **The action shade** — buttons, prices, links, active states. 4.69:1 on white, clears WCAG AA. |

On dark surfaces the accent lightens to `#FF8A4C`, and text on top of it must be near-black
(`#0A0A0B`) — white on that orange measures ≈2.2:1 and fails outright.

**Spend the accent sparingly.** It marks the primary action, the price, an active state. When the
accent becomes a background, it stops meaning anything.

**Status colours are not the brand.** Success green and error red exist for genuine status only —
stock, form errors, toasts. Destructive actions stay **red**, never brand orange, or a delete button
becomes indistinguishable from add-to-cart.

## 3. Typography

- **Archivo** — display: titles, prices, badges, countdowns. Always uppercase, tight tracking.
- **Inter** — body and UI. Never uppercase for body copy.
- **Poppins** — product cards only (storefront).

## 4. Language

**French only** in every customer-facing surface. No English UI labels (`New` → `Nouveau`,
`-30% OFF` → `-30%`, `Brands` → `Marques`), no Arabic leftovers, and `aria-label`s in French too.
Dates use French month names.

Arabic exists as **content** (blog articles) and is declared per-article, but the interface chrome
stays French.

## 5. Iconography

**lucide only.** Monoline, consistent stroke weight. **Zero emoji or dingbat glyphs as UI** —
`🎉 ⚡ ✓ ✦ ★ › → ⋮` are all banned. A broken image falls back to a lucide icon, never to a character.

## 6. Accessibility floor

- Every interactive control has a **≥44×44px** hit area.
- Text on the accent must clear **4.5:1** — which is why §2 has two shades and not one.
- Never invert an asset to survive a background. If a logo needs `brightness-0 invert` to be legible,
  the surface is wrong.
- Motion is calm and respects `prefers-reduced-motion`.

## 7. Photography

One grade across everything, so the whole catalogue reads as one campaign: dark neutral backgrounds,
a single warm key light from one side, cool neutral shadows, no HDR or clarity crunch.

**Orange appears only as a physical object in frame** — a label, a lid, a band on a bag. Never as a
colour wash, overlay or gradient over the photograph.

No on-image text (it cannot be translated, indexed, or read by a screen reader), no visible
competitor branding.

## 8. Image encoding

**Encode lossily exactly once.** Masters are uploaded lossless; the serve-time optimiser does the
single lossy pass. Two lossy encodes stacked — a compressed upload re-encoded on delivery — is what
produced visibly mushy product shots, and it is invisible until you compare against the master.
