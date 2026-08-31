import type { Article } from '@/types';
import { BLOG_TOPICS, type BlogTopicId } from '@/content/blogTopics';
import { decodeHtmlEntities } from '@/util/htmlEntities';

const WORDS_PER_MINUTE = 200;

export type BlogIndexArticle = Pick<
  Article,
  | 'id'
  | 'slug'
  | 'designation_fr'
  | 'cover'
  | 'created_at'
  | 'updated_at'
  | 'blog_type'
  | 'categories'
  | 'tags'
> & {
  excerpt: string;
  readingMinutes: number;
  topicId: BlogTopicId;
};

export function stripBlogHtml(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalize(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function getBlogExcerpt(article: Article, maxLength = 160): string {
  let text = stripBlogHtml(article.description || article.description_fr || '').trim();
  const title = decodeHtmlEntities(article.designation_fr || '').trim();

  if (title && normalize(text).startsWith(normalize(title))) {
    text = text.slice(title.length).replace(/^[\s.,?!:;\-–—]+/, '').trim();
  }

  if (!text) return 'Lire le guide complet et retrouver les conseils pratiques de l’équipe Protein.tn.';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

export function getBlogReadingMinutes(article: Article): number {
  const words = stripBlogHtml(article.description || article.description_fr || '')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function classifyBlogTopic(article: Article, excerpt: string): BlogTopicId {
  const explicit = String(article.blog_type || '').trim() as BlogTopicId;
  if (BLOG_TOPICS.some((topic) => topic.id === explicit)) return explicit;

  const haystack = normalize(`${article.designation_fr || ''} ${excerpt}`);
  return (
    BLOG_TOPICS.find((topic) => topic.id !== 'all' && topic.keywords.some((keyword) => haystack.includes(keyword)))
      ?.id || 'all'
  );
}

export function toBlogIndexArticle(article: Article): BlogIndexArticle {
  const excerpt = getBlogExcerpt(article);
  return {
    id: article.id,
    slug: article.slug,
    designation_fr: article.designation_fr,
    cover: article.cover,
    created_at: article.created_at,
    updated_at: article.updated_at,
    blog_type: article.blog_type,
    categories: article.categories,
    tags: article.tags,
    excerpt,
    readingMinutes: getBlogReadingMinutes(article),
    topicId: classifyBlogTopic(article, excerpt),
  };
}
