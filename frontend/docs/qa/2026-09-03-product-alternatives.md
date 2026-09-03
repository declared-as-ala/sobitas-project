# Product comparison and request flow — 3 September 2026

## Scope and decisions

Existing Protein.tn tokens, typefaces, stock green and orange actions retained. Product photos are catalogue assets, not generated substitutes. Desktop keeps a semantic table; below 1024 px each row becomes a two-column detail card without dropping nutritional fields. A compact image and portion basis anchor every product.

Functional changes are deliberate: `/similar_products` returns at most six published, stocked, non-pack products; same subcategory comes first, then its parent category. The frontend also rejects forced stock-outs, unknown stock and duplicates. PDP enquiries reuse those results; catalogue-card enquiries fetch once on opening. The shopper can bypass suggestions even during loading or failure.

Requests retain the original product, require name/phone/email, and keep optional notes collapsed. Product identity and its HTTPS link are resolved on the server. The existing contact endpoint, spam controls, persistence and independent client/admin mail delivery remain. Credentials, checkout, points, SMS and catalogue records were not changed.

## Data integrity

Nutrition is read only from stored label panels/structured nutrition. Exact units and serving sizes are shown; ambiguous multi-column panels are not interpreted. Gluten/lactose absence is never inferred from missing information or the word “isolate”. Unknown fields explicitly say “Non renseigné”. Packs are not promoted as a substitute for one tub. Crawler-visible comparison content uses the same facts and selection.

## Verification

- `check-comparison-facts.mjs`: 25 assertions (structured values, legacy malformed panels, units, zero sugar, serving basis, conflicting/missing allergen statements). Added to prebuild.
- `ProductRequestFlowTest.php`: eight isolated SQLite/mail-fake tests in the production Docker image, before SSH rollout. Covers stocked selection, six-item cap, validation, honeypot, server product identity, two receipts, existing general contact and escaped HTML.
- `measure-comparison.mjs`: 50 states across 320/390/768/1024/1440 px and light/dark: table, alternatives, form, simulated failure/retry, success. Text contrast and 44 px controls checked; all comparison images loaded. All POSTs intercepted; no real client contacted.
- `check-request-card.mjs`: production-build catalogue entry; delayed/failed/empty/successful alternatives, one GET per opening, unavailable/pack exclusion and unrestricted continuation.
- `measure-pdp.mjs`: 503/503 checks on production build, three real products and seven viewport sizes. Updated the comparator assertion for five retained data groups instead of the old six/three-column layout.
- `measure-request-emails.mjs`: six actual Blade-rendered synthetic previews at 320/390/1440 px, client/admin; logo, overflow and text contrast checks.
- Next production compilation and TypeScript validation passed.
- New comparison/request components have no design-lint findings. Full existing design ratchet still reports unrelated pre-existing checkout/order-confirmation/pack-builder debt; baseline was not relaxed or committed.

Local screenshots: `.snap/comparison-before`, `.snap/comparison-after`, `.snap/comparison-card`, `.snap/request-emails-final` (gitignored). Representative mobile/desktop and light/dark screenshots inspected manually. No claim of real inbox delivery or exhaustive email-client rendering: transport configuration is unchanged and sends were mocked.

## Remaining catalogue limitation

Some stocked products still lack nutritional panels or explicit gluten/lactose declarations. This UI shows that honestly; the task does not invent or bulk-enrich their data. The existing all-products cap warning and unrelated design debt remain outside this change.
