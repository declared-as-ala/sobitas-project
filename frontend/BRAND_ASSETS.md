# Protein.tn — asset brief

What to generate, at what size, and the exact prompts. Hand these to any AI image generator
(Midjourney, Flux, Ideogram, DALL·E, Firefly — all fine).

> **The Groq key in this repo cannot do this.** `api.groq.com` is a text-LLM host used for review
> moderation. It has no image generation endpoint. Grok (xAI) is a different company; we have no
> xAI key. So these are generated outside the project and uploaded through the admin.

---

## The one rule that makes it look like a brand

Every image below shares **one grade**. This matters more than any individual picture — a set of
six tiles in six different lighting styles reads as stock photography, the same six in one grade
reads as a campaign.

- Dark neutral gym / studio backgrounds
- **One warm key light from a single side**, cool neutral shadows
- No HDR, no clarity crunch, no orange-and-teal
- **Red appears only as a physical object in frame** — a plate, a strap, a cap. Never as a colour
  wash, gradient or overlay. The interface owns the red; the photography must not compete.
- Real athletes, no visible competitor branding, **no text baked into the image**

Text is never part of the artwork. The site renders headlines as real HTML so they stay
responsive, translatable and indexable — an image with text in it breaks all three.

---

## 1. Hero slides — highest priority

**The image IS the slide.** The site no longer prints its own headline over your banner. Whatever
you design — product shot, price, promo text — is shown exactly as uploaded, whole. Design the
complete banner; bake any wording you want directly into the artwork.

Uploaded in admin under **Slides**. Each slide takes a desktop image, a mobile image, and four
optional text fields.

| | Size | Ratio | Notes |
|---|---|---|---|
| Desktop | **2400 × 1000** | 12:5 | The frame matches this ratio, so the whole banner shows with almost no crop. Export at this exact size. |
| Mobile | **1200 × 1500** | 4:5 | A **separate portrait** banner — do not reuse the desktop one, it will crop hard. |

### The text fields are optional — and here is exactly what they do

- **Leave Titre / Sous-titre / Texte du bouton BLANK** → the banner shows as a pure image, no
  overlay, no darkening. This is the recommended mode when your artwork already has its own text
  (like the ANABOLIC WHEY 80 banner). **Still fill "Lien"** so tapping the banner opens the right
  page.
- **Fill them** → a small caption + button appears in the **bottom-LEFT** corner over a light
  shadow. Only the bottom-left darkens (never the right side, so a price baked bottom-right stays
  clean). Use this for a plain lifestyle photo that needs a line of text. Keep the bottom-left of
  such a photo calm.

**Prompt (only if you want an AI photo rather than a designed banner) — desktop:**
```
Athletic man mid-workout in a dark industrial gym, centred composition, deep charcoal
background. Single warm key light from camera right, cool neutral shadows. A red weight
plate visible on the floor as the only red object. Photographic, 85mm, shallow depth of
field, natural skin tones, no text, no logos, no watermark. Wide cinematic crop 2400x1000.
```

**Prompt — mobile:** same sentence, ending:
```
...Vertical 4:5 crop, subject in the upper two-thirds, lower third calmer floor. 1200x1500.
```

Swap the subject per slide — a woman lifting, a shaker being filled, a protein tub held in hand —
but keep every other word identical. That is what holds the grade together.

---

## 2. Category tiles — 6 images

These already exist and all six are live, so this is an upgrade, not a blocker.

**Size: 1200 × 1200 (square).** The new rail crops to a square, so anything wider gets
centre-cropped and loses its edges.

| Category | Subject |
|---|---|
| PROTÉINES | Whey tub with scoop, powder spilled on dark slate |
| PRISE DE MASSE | Large gainer tub, shaker, oats |
| PERFORMANCE | Pre-workout tub, wrist wraps, chalk |
| PERTE DE POIDS | Slim tub, measuring tape, dark background |
| SANTÉ & VITALITÉ | Amber capsule bottles, dry botanicals |
| ÉQUIPEMENT | Shaker, belt, straps, arranged flat |

**Prompt template:**
```
{SUBJECT}, centred product still life on dark charcoal slate, single warm key light
from the left, cool soft shadow to the right, matte finish, no reflections blown out.
Unbranded plain container. Square 1:1, photographic, no text, no logo, no watermark.
```

Keep the container **unbranded** — these tiles link to a category holding many brands, so a
recognisable tub misrepresents what is behind the link.

---

## 3. Optional later

- **Brand wall logos** — flat SVG/PNG on transparent, single row height.
- **Empty states** (empty cart, no results, 404) — one line drawing style, red accent only.

---

## Uploading

Hero slides: admin → **Slides** → new slide → upload desktop + mobile, set **Lien** (where the
banner links), set Ordre, tick Actif. Leave Titre / Sous-titre / Texte du bouton **blank** for a
pure-image banner; fill them only if you want a small caption in the bottom-left corner.

Category covers: admin → **Catégories** → edit → replace the cover image.

Changes appear within roughly 10 minutes (5-minute API cache plus 5-minute page revalidation).
