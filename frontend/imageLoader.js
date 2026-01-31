/**
 * Custom Next.js image loader.
 * Next.js requires the loader to implement width - we must include width in the returned URL.
 * For storage URLs (admin.sobitas.tn, admin.protein.tn): append w= param (server may ignore it).
 * For other URLs: use default Next.js optimization (/_next/image?url=...).
 */
module.exports = function imageLoader({ src, width, quality }) {
  const isStorageUrl =
    typeof src === 'string' &&
    (src.includes('/storage/') ||
      src.includes('/storage-proxy/') ||
      src.startsWith('http://localhost/storage') ||
      src.startsWith('https://localhost/storage') ||
      (src.startsWith('http') && (src.includes('/storage/') || src.includes('/storage-proxy/') || src.includes('admin.sobitas.tn') || src.includes('admin.protein.tn'))));
  if (isStorageUrl) {
    // Include width to satisfy Next.js requirement (append as query param)
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}w=${width}&q=${quality || 75}`;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
};
