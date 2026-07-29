import type { Article } from '@/types';

/**
 * Language of a blog article, from the CMS field when set and detected from the text when not.
 *
 * 31 of the 100 blog articles are written in Arabic — titles, slugs and bodies — and every one was
 * being served as French: `<html lang="fr">`, JSON-LD `inLanguage: "fr-TN"`, no `dir="rtl"`, no
 * `og:locale`. Declaring the wrong language on a third of the blog tells Google to evaluate Arabic
 * prose against French queries, and leaves RTL text laid out LTR for readers and screen readers.
 *
 * The CMS has a `content_lang` column for exactly this, but it is NULL on every article checked —
 * so the existing dir/lang logic in ArticleDetailClient could never fire. Detection fills the gap
 * without waiting for 31 rows to be edited by hand, and an explicit `content_lang` always wins so
 * the admin keeps the final say.
 *
 * Deliberately narrow: this distinguishes Arabic script from Latin script, which is the only
 * distinction this catalogue actually needs. It is not a general-purpose language identifier.
 */

/** Arabic block + Arabic Supplement + Arabic Extended-A + Arabic Presentation Forms. */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
const LATIN_RE = /[A-Za-zÀ-ÿ]/g;

export type ArticleLanguage = {
  /** BCP-47 tag for lang / inLanguage, e.g. "ar" or "fr-TN". */
  code: string;
  /** Writing direction for the rendered body. */
  dir: 'ltr' | 'rtl';
  /** Open Graph locale, e.g. "ar_TN" or "fr_TN". */
  ogLocale: string;
};

const FRENCH: ArticleLanguage = { code: 'fr-TN', dir: 'ltr', ogLocale: 'fr_TN' };
const ARABIC: ArticleLanguage = { code: 'ar', dir: 'rtl', ogLocale: 'ar_TN' };

function fromCode(raw: string): ArticleLanguage | null {
  const code = raw.trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith('ar')) return { ...ARABIC, code: raw.trim() };
  if (code.startsWith('fr')) return { ...FRENCH, code: raw.trim() };
  // A configured language we do not have direction rules for: trust the code, assume LTR.
  return { code: raw.trim(), dir: 'ltr', ogLocale: raw.trim().replace('-', '_') };
}

/**
 * Detect from the visible text. Compares Arabic to Latin letter counts rather than looking for
 * "any Arabic character", because these articles routinely embed French product names
 * ("Whey hedhi من أحسن ما جربت") and a single Arabic word must not flip a French article.
 */
function detect(...samples: Array<string | null | undefined>): ArticleLanguage {
  const text = samples
    .map((s) => String(s ?? ''))
    .join(' ')
    .replace(/<[^>]*>/g, ' ');

  const arabic = (text.match(ARABIC_RE) ?? []).length;
  const latin = (text.match(LATIN_RE) ?? []).length;

  // Require a clear majority so mixed text stays French, which is the site default.
  return arabic > latin ? ARABIC : FRENCH;
}

export function resolveArticleLanguage(article: Article | null | undefined): ArticleLanguage {
  const explicit = fromCode(String(article?.content_lang ?? ''));
  if (explicit) return explicit;

  return detect(
    article?.designation_fr,
    (article as { description_fr?: string } | null | undefined)?.description_fr,
    article?.slug
  );
}
