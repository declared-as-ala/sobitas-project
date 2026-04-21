# Blog API Documentation

## Overview
This document describes the blog/article API endpoints available in the Sobitas backend.

## Base URL
```
https://admin.protein.tn/api
```
or in development:
```
http://localhost:8000/api
```

---

## API Endpoints

### 1. Get All Articles
**Endpoint:** `GET /all_articles`

**Description:** Retrieves all published articles.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "article-slug",
    "designation_fr": "Article Title",
    "description": "Article description",
    "description_fr": "Description en français",
    "cover": "path/to/cover/image.jpg",
    "created_at": "2023-09-15T10:30:00.000000Z",
    "publier": 1
  }
]
```

**Example Request:**
```bash
curl https://admin.protein.tn/api/all_articles
```

**Frontend Usage:**
```typescript
import { getAllArticles } from '@/services/api';

const articles = await getAllArticles();
```

---

### 2. Get Article Details by Slug
**Endpoint:** `GET /article_details/{slug}`

**Description:** Retrieves a single article by its slug.

**Parameters:**
- `slug` (string, required) - The article slug

**Response:**
```json
{
  "id": 1,
  "slug": "article-slug",
  "designation_fr": "Article Title",
  "description": "Article description",
  "description_fr": "Description en français",
  "cover": "path/to/cover/image.jpg",
  "created_at": "2023-09-15T10:30:00.000000Z",
  "publier": 1
}
```

**Example Request:**
```bash
curl https://admin.protein.tn/api/article_details/my-article-slug
```

**Frontend Usage:**
```typescript
import { getArticleDetails } from '@/services/api';

const article = await getArticleDetails('my-article-slug');
```

**Note:** Only returns articles where `publier = 1` (published). Returns `null` if article not found or not published.

---

### 3. Get Latest Articles
**Endpoint:** `GET /latest_articles`

**Description:** Retrieves the 4 most recent published articles.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "article-slug",
    "designation_fr": "Article Title",
    "cover": "path/to/cover/image.jpg",
    "created_at": "2023-09-15T10:30:00.000000Z"
  }
]
```

**Note:** This endpoint only returns limited fields: `id`, `slug`, `designation_fr`, `cover`, and `created_at`.

**Example Request:**
```bash
curl https://admin.protein.tn/api/latest_articles
```

**Frontend Usage:**
```typescript
import { getLatestArticles } from '@/services/api';

const latestArticles = await getLatestArticles();
```

---

## Article Data Structure

### Article Interface (TypeScript)
```typescript
interface Article {
  id: number;
  slug: string;
  designation_fr: string;
  description?: string;
  description_fr?: string;
  cover?: string;
  created_at?: string;
  publier?: number; // 1 = published, 0 = unpublished
}
```

### Field Descriptions
- **id**: Unique article identifier
- **slug**: URL-friendly identifier (used in routes like `/blog/{slug}`)
- **designation_fr**: Article title in French
- **description**: Article description (optional)
- **description_fr**: Article description in French (optional)
- **cover**: Path to cover image (relative to storage)
- **created_at**: Article creation timestamp
- **publier**: Publication status (1 = published, 0 = unpublished)

---

## Image URLs

### Getting Full Image URL
The `cover` field returns a relative path. To get the full URL, use the `getStorageUrl` helper:

```typescript
import { getStorageUrl } from '@/services/api';

const imageUrl = getStorageUrl(article.cover);
// Returns: https://admin.protein.tn/storage/path/to/image.jpg
```

---

## Backend Implementation

### Controller Location
`backend/app/Http/Controllers/ApisController.php`

### Methods

#### `allArticles()`
```php
public function allArticles()
{
    $articles = Article::where('publier', 1)->get();
    return $articles;
}
```

#### `articleDetails($slug)`
```php
public function articleDetails($slug)
{
    $article = Article::where('slug', $slug)->where('publier', 1)->first();
    return $article;
}
```

#### `latestArticles()`
```php
public function latestArticles()
{
    $last_articles = Article::where('publier', 1)
        ->latest('created_at')
        ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
        ->limit(4)
        ->get();
    return $last_articles;
}
```

---

## Frontend Service Functions

All blog API functions are available in `frontend/src/services/api.ts`:

```typescript
// Get all articles
export const getAllArticles = async (): Promise<Article[]> => {
  const response = await api.get('/all_articles');
  return response.data;
};

// Get article by slug
export const getArticleDetails = async (slug: string): Promise<Article> => {
  const response = await api.get<Article>(`/article_details/${slug}`);
  return response.data;
};

// Get latest articles
export const getLatestArticles = async (): Promise<Article[]> => {
  const response = await api.get<Article[]>('/latest_articles');
  return response.data;
};
```

---

## Usage Examples

### Example 1: Display All Articles
```typescript
import { getAllArticles } from '@/services/api';
import { getStorageUrl } from '@/services/api';

const articles = await getAllArticles();

articles.forEach(article => {
  console.log(article.designation_fr);
  console.log(getStorageUrl(article.cover));
});
```

### Example 2: Get Single Article
```typescript
import { getArticleDetails } from '@/services/api';

// In a Next.js page component
export default async function BlogPost({ params }: { params: { slug: string } }) {
  const article = await getArticleDetails(params.slug);
  
  if (!article) {
    return <div>Article not found</div>;
  }
  
  return (
    <div>
      <h1>{article.designation_fr}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.description_fr }} />
    </div>
  );
}
```

### Example 3: Get Latest Articles for Homepage
```typescript
import { getLatestArticles } from '@/services/api';

const latestArticles = await getLatestArticles();
// Returns only 4 most recent articles with limited fields
```

---

## Error Handling

### Article Not Found
If an article with the given slug doesn't exist or is not published, the API returns `null`.

**Frontend handling:**
```typescript
try {
  const article = await getArticleDetails('non-existent-slug');
  if (!article) {
    // Handle not found
    notFound(); // Next.js function
  }
} catch (error) {
  // Handle API error
  console.error('Error fetching article:', error);
}
```

---

## Notes

1. **Authentication:** All blog endpoints are public and do not require authentication.

2. **Filtering:** All endpoints automatically filter for published articles only (`publier = 1`).

3. **Caching:** The frontend API service includes cache-control headers to prevent caching.

4. **Image Storage:** Cover images are stored in Laravel storage and accessed via the storage proxy.

5. **Slug Format:** Article slugs should be URL-friendly (lowercase, hyphens instead of spaces).

---

## Related Files

- **Backend Routes:** `backend/routes/api.php` (lines 26-28)
- **Backend Controller:** `backend/app/Http/Controllers/ApisController.php` (lines 208-223)
- **Backend Model:** `backend/app/Article.php`
- **Frontend Service:** `frontend/src/services/api.ts` (lines 266-280)
- **Frontend Types:** `frontend/src/types/index.ts` (lines 97-106)
- **Blog Page:** `frontend/src/app/blog/[slug]/page.tsx`
- **Blog List Page:** `frontend/src/app/blog/page.tsx`
