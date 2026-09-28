import { stripHeadOnlyTags } from './stripHeadOnlyTags';

/**
 * Remove legacy commerce links and duplicate page headings from CMS article bodies.
 *
 * Old articles contain links such as `/shop/creatine`, `/category/creatine` and `/product/...`.
 * Those routes either redirect, describe stock that has changed, or create a second commercial
 * route inside an article that already has one deliberate commerce bridge. Keeping the label as
 * text preserves the sentence; the current category link is injected separately by the article
 * page. CMS-authored H1 elements are demoted because the page template already owns the only H1.
 */
export function sanitizeArticleHtml(html: string | undefined): string {
  if (!html) return '';

  // A pasted head block (second meta description / og tags) must not render — see the util.
  return stripHeadOnlyTags(html)
    .replace(/<h1\b([^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>')
    .replace(
      /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi,
      (full, before: string, rawHref: string, after: string, label: string) => {
        let href = rawHref.trim();
        try {
          const parsed = new URL(href, 'https://protein.tn');
          if (parsed.hostname === 'protein.tn' || parsed.hostname === 'www.protein.tn') {
            href = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          }
        } catch {
          return full;
        }

        const legacyCommerceRoute =
          /^\/(?:product|category)(?:\/|$)/i.test(href) ||
          /^\/shop(?:[/?#]|$)/i.test(href) ||
          href === '/';
        if (legacyCommerceRoute) return label;

        return `<a${before}href="${href}"${after}>${label}</a>`;
      }
    );
}
