import { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllArticles } from '@/services/api';
import { BlogPageClient } from './BlogPageClient';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Blog Nutrition Sportive & Compléments | SOBITAS Tunisie',
  description: 'Guides, conseils prise de masse, choix whey et créatine. Tout pour la nutrition sportive en Tunisie.',
};

// dynamic = 'force-dynamic': page is rendered on every request (no Full Route Cache).
// Individual fetch() calls use next:{tags:['blog']} → cached in Data Cache until
// the admin triggers revalidateTag('blog') via POST /api/revalidate-blog.
export const dynamic = 'force-dynamic';

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
