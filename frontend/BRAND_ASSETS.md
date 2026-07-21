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

Uploaded in admin under **Slides**. Each slide takes a desktop image, a mobile image, and the text
fields (Titre, Sous-titre, Texte du bouton, Lien).

| | Size | Composition |
|---|---|---|
| Desktop | **2400 × 1000** | Subject **right of centre**. Keep the **left 40% calm** — the headline sits there. |
| Mobile | **1200 × 1500** (4:5) | Subject in the **upper 55%**. Keep the lower 45% calm. |

The calm zone is not optional. The site lays a dark gradient over that side for legibility; if the
subject is there, the gradient eats it.

**Prompt — desktop:**
```
Athletic man mid-workout in a dark industrial gym, shot from the right side of frame,
left third of the image empty dark negative space. Single warm key light from camera
right, cool neutral shadows, deep charcoal background. A red weight plate visible on
the floor as the only red object. Photographic, 85mm, shallow depth of field, natural
skin tones, no text, no logos, no watermark. Wide cinematic crop 2400x1000.
```

**Prompt — mobile:** same sentence, ending:
```
...Vertical 4:5 crop, subject in the upper half, lower half empty dark floor.
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

Hero slides: admin → **Slides** → new slide → upload desktop + mobile, fill Titre / Sous-titre /
Texte du bouton / Lien, set Ordre, tick Actif.

Category covers: admin → **Catégories** → edit → replace the cover image.

Changes appear within roughly 10 minutes (5-minute API cache plus 5-minute page revalidation).
