/**
 * Custom Next.js image loader.
 *
 * Images stored in the Laravel backend (admin.protein.tn/storage/*) bypass
 * Next.js image optimisation and are fetched directly. This prevents a
 * double-proxy hop and avoids re-encoding already-optimised WebP files.
 *
 * For every other source the built-in /_next/image optimiser is used.
 *
 * Next.js requires each loader to include the `width` parameter in the
 * returned URL (even if the server ignores it) — we append ?w= as a no-op.
 */
module.exports = function imageLoader({ src, width, quality }) {
  if (typeof src !== 'string' || src === '') {
    return src;
  }

  const isStorageUrl =
    src.includes('admin.protein.tn') ||
    src.includes('admin.sobitas.tn') ||
    src.includes('/storage/');

  if (isStorageUrl) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}&q=${quality || 75}`;
  }

  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
};
