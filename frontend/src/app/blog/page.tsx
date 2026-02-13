import { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllArticles } from '@/services/api';
import { BlogPageClient } from './BlogPageClient';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Blog Nutrition Sportive & Compléments | SOBITAS Tunisie',
  description: 'Guides, conseils prise de masse, choix whey et créatine. Tout pour la nutrition sportive en Tunisie.',
};

// Force dynamic rendering & disable ALL fetch caching for this route.
// fetchCache = 'force-no-store' is the nuclear option: it ensures every fetch()
// in this route segment bypasses the Next.js Data Cache, even if individual
// fetch calls forget cache:'no-store'. This fixes stale blog data after admin edits.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function getBlogData() {
  try {
    const articles = await getAllArticles();
    return { articles };
  } catch (error) {
    console.error('Error fetching blog data:', error);
    return { articles: [] };
  }
}

export default async function BlogPage() {
  const { articles } = await getBlogData();
  return (
    <Suspense fallback={<LoadingSpinner fullScreen message="Chargement du blog..." />}>
      <BlogPageClient articles={articles} />
    </Suspense>
  );
}
