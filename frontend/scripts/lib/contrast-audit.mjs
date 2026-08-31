/**
 * The WCAG AA pass, as a function that runs INSIDE the page.
 *
 * Lifted verbatim out of `audit-contrast.mjs` so a second script can use it. `audit-contrast` has
 * top-level await and starts a browser the moment it is imported, so `measure-account` — which is
 * the only thing that can reach a page behind a login — had no way to reuse it short of a second
 * implementation of alpha compositing. Two implementations of a contrast rule is two answers.
 *
 * Serialized to the browser by puppeteer, so it may close over NOTHING.
 */
export const AUDIT = () => {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  // src-over compositing: `fg` painted on top of `bg`, both premultiplied out to opaque.
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const hex = (c) =>
    '#' + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();

  const results = [];

  for (const el of document.querySelectorAll('*')) {
    // Only elements with their OWN visible text, so a wrapper is not audited for its child's text.
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!text) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // sr-only: 1px clipped box. Never rendered for sighted users, so contrast does not apply.
    if (rect.width <= 1 && rect.height <= 1) continue;

    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;

    // Walk the ancestor chain collecting painted layers until something opaque is reached.
    const layers = [];
    let overImage = false;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') overImage = true;
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
    }
    if (layers.length === 0) layers.push({ r: 255, g: 255, b: 255, a: 1 });

    // Composite bottom-up.
    let bg = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg);

    const resolvedFg = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const r = ratio(resolvedFg, bg);

    if (overImage) {
      results.push({ status: 'UNKNOWN', text: text.slice(0, 40), r: null, min, fg: hex(resolvedFg), bg: hex(bg), size, cls: el.className?.toString().slice(0, 60) || '' });
    } else if (r < min) {
      results.push({ status: 'FAIL', text: text.slice(0, 40), r: Math.round(r * 100) / 100, min, fg: hex(resolvedFg), bg: hex(bg), size, cls: el.className?.toString().slice(0, 60) || '' });
    }
  }
  return results;
};
