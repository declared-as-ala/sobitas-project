import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Product,
  Category,
  Brand,
  Article,
  Order,
  OrderRequest,
  OrderDetail,
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ContactRequest,
  NewsletterRequest,
  Coordinate,
  Service,
  FAQ,
  Page,
  SeoPage,
  HomeData,
  AccueilData,
  Review,
} from '@/types';

// Get API URL from .env (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STORAGE_URL)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? 'https://admin.protein.tn/storage';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s - avoids ETIMEDOUT when admin.sobitas.tn is slow
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Prevent caching at all levels (browser, proxy, nginx)
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: retry on ETIMEDOUT/ECONNRESET, handle 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config?: { _retryCount?: number } }) => {
    const retryCount = error.config?._retryCount ?? 0;
    const isRetryable =
      (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') &&
      retryCount < 2;
    if (isRetryable && error.config) {
      (error.config as any)._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, 1500));
      return api.request(error.config);
    }
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to get storage URL - always use NEXT_PUBLIC_STORAGE_URL (admin.sobitas.tn)
// Rewrites localhost URLs from backend so images load from deployed backend
// For blog images, adds cache busting parameter based on updated_at or created_at
export const getStorageUrl = (path?: string, cacheBust?: string | number): string => {
  if (!path) return '';
  const base = STORAGE_URL.replace(/\/$/, '');
  let finalUrl = '';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const pathPart = u.pathname.replace(/^\/storage\/?/, '');
        finalUrl = pathPart ? `${base}/${pathPart}` : base;
      } else {
        finalUrl = path;
      }
    } catch {
      finalUrl = path;
    }
  } else {
    const clean = path.replace(/^\/+/, '');
    finalUrl = clean ? `${base}/${clean}` : base;
  }
  
  // Add cache busting for blog images
  if (cacheBust) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    const timestamp = typeof cacheBust === 'number' 
      ? cacheBust 
      : typeof cacheBust === 'string' 
        ? new Date(cacheBust).getTime() 
        : Date.now();
    finalUrl = `${finalUrl}${separator}v=${timestamp}`;
  }
  
  return finalUrl;
};

// ==================== PUBLIC API ENDPOINTS ====================

// Homepage & Accueil
export const getAccueil = async (): Promise<AccueilData> => {
  try {
    const response = await api.get<AccueilData>('/accueil');
    // Ensure response.data exists and has the expected structure
    if (!response.data) {
      console.warn('[getAccueil] API returned empty data, using defaults');
      return {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      };
    }
    // Ensure all required fields exist with defaults
    return {
      categories: response.data.categories || [],
      last_articles: response.data.last_articles || [],
      ventes_flash: response.data.ventes_flash || [],
      new_product: response.data.new_product || [],
      packs: response.data.packs || [],
      best_sellers: response.data.best_sellers || [],
    };
  } catch (error) {
    console.error('[getAccueil] API error:', error);
    // Return empty structure on error
    return {
      categories: [],
      last_articles: [],
      ventes_flash: [],
      new_product: [],
      packs: [],
      best_sellers: [],
    };
  }
};

export const getHome = async (): Promise<HomeData> => {
  const response = await api.get<HomeData>('/home');
  return response.data;
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<Category[]>('/categories');
  return response.data;
};

// Slides
export const getSlides = async (): Promise<any[]> => {
  const response = await api.get('/slides');
  return response.data;
};

// Coordinates
export const getCoordinates = async (): Promise<Coordinate> => {
  const response = await api.get<Coordinate>('/coordonnees');
  return response.data;
};

// Products
export const getAllProducts = async (): Promise<{ products: Product[]; brands: Brand[]; categories: Category[] }> => {
  try {
    const response = await api.get('/all_products');
    // Ensure response.data exists and has the expected structure
    if (!response.data) {
      console.warn('[getAllProducts] API returned empty data, using defaults');
      return {
        products: [],
        brands: [],
        categories: [],
      };
    }
    // Ensure all required fields exist with defaults
    return {
      products: response.data.products || [],
      brands: response.data.brands || [],
      categories: response.data.categories || [],
    };
  } catch (error) {
    console.error('[getAllProducts] API error:', error);
    // Return empty structure on error
    return {
      products: [],
      brands: [],
      categories: [],
    };
  }
};

export const getProductDetails = async (slug: string, cacheBust?: boolean): Promise<Product> => {
  // Remove any query parameters from slug if present
  const cleanSlug = slug.split('?')[0];
  const url = cacheBust
    ? `/product_details/${cleanSlug}?t=${Date.now()}`
    : `/product_details/${cleanSlug}`;
  try {
    const response = await api.get<Product>(url);
    if (!response.data || !response.data.id) {
      console.warn(`Product "${cleanSlug}" not found in API response`);
      throw new Error('Product not found');
    }
    return response.data;
  } catch (error: any) {
    // If 404, throw error so page can handle it with notFound()
    if (error.response?.status === 404) {
      console.warn(`Product "${cleanSlug}" not found (404)`);
      throw error;
    }
    // Re-throw other errors
    throw error;
  }
};

export const getProductsByCategory = async (slug: string): Promise<{
  category: Category;
  sous_categories: any[];
  products: Product[];
  brands: Brand[];
}> => {
  try {
    const response = await api.get(`/productsByCategoryId/${slug}`);
    // Check if category exists in response
    if (!response.data || !response.data.category || !response.data.category.id) {
      console.warn(`Category "${slug}" not found in API response`);
      throw new Error('Category not found');
    }
    return response.data;
  } catch (error: any) {
    // If 404, throw error so page can handle it with notFound()
    if (error.response?.status === 404) {
      console.warn(`Category "${slug}" not found (404)`);
      throw error;
    }
    // Re-throw other errors
    throw error;
  }
};

export const getProductsBySubCategory = async (slug: string): Promise<{
  sous_category: any;
  products: Product[];
  brands: Brand[];
  sous_categories: any[];
}> => {
  try {
    const response = await api.get(`/productsBySubCategoryId/${slug}`);
    // Check if subcategory exists in response
    if (!response.data || !response.data.sous_category || !response.data.sous_category.id) {
      console.warn(`Subcategory "${slug}" not found in API response`);
      throw new Error('Subcategory not found');
    }
    return response.data;
  } catch (error: any) {
    // If 404, throw error so page can handle it with notFound()
    if (error.response?.status === 404) {
      console.warn(`Subcategory "${slug}" not found (404)`);
      throw error;
    }
    // Re-throw other errors
    throw error;
  }
};

export const getProductsByBrand = async (brandId: number): Promise<{
  categories: Category[];
  products: Product[];
  brands: Brand[];
  brand: Brand;
}> => {
  const response = await api.get(`/productsByBrandId/${brandId}`);
  return response.data;
};

export const searchProducts = async (text: string): Promise<{
  products: Product[];
  brands: Brand[];
}> => {
  const response = await api.get(`/searchProduct/${text}`);
  return response.data;
};

export const searchProductsBySubCategory = async (slug: string, text: string): Promise<{
  products: Product[];
  brands: Brand[];
}> => {
  const response = await api.get(`/searchProductBySubCategoryText/${slug}/${text}`);
  return response.data;
};

export const getSimilarProducts = async (sousCategorieId: number): Promise<{ products: Product[] }> => {
  const response = await api.get(`/similar_products/${sousCategorieId}`);
  return response.data;
};

export const getLatestProducts = async (): Promise<{
  new_product: Product[];
  packs: Product[];
  best_sellers: Product[];
}> => {
  const response = await api.get('/latest_products');
  return response.data;
};

export const getLatestPacks = async (): Promise<Product[]> => {
  const response = await api.get('/latest_packs');
  return response.data;
};

export const getNewProducts = async (): Promise<Product[]> => {
  const response = await api.get('/new_product');
  return response.data;
};

export const getBestSellers = async (): Promise<Product[]> => {
  const response = await api.get('/best_sellers');
  return response.data;
};

export const getFlashSales = async (): Promise<Product[]> => {
  const response = await api.get('/ventes_flash');
  return response.data;
};

export const getPacks = async (): Promise<Product[]> => {
  const response = await api.get('/packs');
  return response.data;
};

// Brands
export const getAllBrands = async (): Promise<Brand[]> => {
  const response = await api.get('/all_brands');
  return response.data;
};

// Aromas & Tags
export const getAromas = async (): Promise<any[]> => {
  const response = await api.get('/aromes');
  return response.data;
};

export const getTags = async (): Promise<any[]> => {
  const response = await api.get('/tags');
  return response.data;
};

// ==================== ARTICLES / BLOG ====================
//
// Caching strategy:
//   Server-side fetches (getAllArticles, getArticleDetails, getLatestArticles)
//   use `next: { tags: ['blog'] }` which opts into the Next.js Data Cache
//   with on-demand tag-based revalidation.  The cache lives until the admin
//   calls POST /api/revalidate-blog which runs `revalidateTag('blog')`.
//
//   Client-side fetch (getAllArticlesClient) is called from BlogPageClient
//   on mount & visibilitychange as a safety-net.  It uses `cache:'no-store'`
//   + no-cache headers so the browser always hits the origin API.
//
//   ⚠ Do NOT add ?_t=Date.now() to server-side URLs — it defeats the
//   Data Cache entirely (every request looks like a different URL).
// ─────────────────────────────────────────────────────────

export const getAllArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] }, // ISR: cached until revalidateTag('blog')
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

export const getArticleDetails = async (slug: string): Promise<Article> => {
  const response = await fetch(`${API_URL}/article_details/${slug}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Article not found');
    }
    throw new Error(`Failed to fetch article: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

export const getLatestArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/latest_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

/**
 * Client-side fetch for articles — called by BlogPageClient on mount
 * and on visibilitychange to guarantee fresh data in the browser.
 * Uses cache:'no-store' + no-cache headers (browser → origin, no Next.js
 * Data Cache involved).  No ?_t= needed.
 */
export const getAllArticlesClient = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

// Media
export const getMedia = async (): Promise<any> => {
  const response = await api.get('/media');
  return response.data;
};

// Services
export const getServices = async (): Promise<Service[]> => {
  const response = await api.get<Service[]>('/services');
  return response.data;
};

// Pages
export const getPages = async (): Promise<Page[]> => {
  const response = await api.get<Page[]>('/pages');
  return response.data;
};

export const getPageBySlug = async (slug: string): Promise<Page> => {
  const response = await api.get<Page>(`/page/${slug}`);
  return response.data;
};

// FAQs
export const getFAQs = async (): Promise<FAQ[]> => {
  const response = await api.get<FAQ[]>('/faqs');
  return response.data;
};

// SEO
export const getSeoPage = async (name: string): Promise<SeoPage> => {
  const response = await api.get<SeoPage>(`/seo_page/${name}`);
  return response.data;
};

// Contact & Newsletter
export const sendContact = async (data: ContactRequest): Promise<{ success: string }> => {
  const response = await api.post('/contact', data);
  return response.data;
};

export const subscribeNewsletter = async (data: NewsletterRequest): Promise<{ success: string } | { error: string }> => {
  const response = await api.post('/newsletter', data);
  return response.data;
};

// Orders
export const getOrderDetails = async (id: number): Promise<{
  facture: Order;
  details_facture: any[];
}> => {
  const response = await api.get(`/commande/${id}`);
  return response.data;
};

export const createOrder = async (orderData: OrderRequest): Promise<{
  id: number;
  message: string;
  'alert-type': string;
}> => {
  // Always use Next.js API route proxy to avoid CORS issues
  // This works in both development and production
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la création de la commande');
  }

  return response.json();
};

// ==================== AUTHENTICATED API ENDPOINTS ====================

// Auth
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/login', credentials);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/register', data);
  return response.data;
};

export const getUser = async (): Promise<User> => {
  const response = await api.get<User>('/user');
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await api.get<User>('/profil');
  return response.data;
};

export const updateProfile = async (data: Partial<User> & { password?: string }): Promise<User> => {
  const response = await api.post<User>('/update_profile', data);
  return response.data;
};

export const getClientOrders = async (): Promise<Order[]> => {
  const response = await api.get<Order[]>('/client_commandes');
  return response.data;
};

export const getOrderDetail = async (id: number): Promise<{
  commande: Order;
  details: OrderDetail[];
}> => {
  const response = await api.post<{
    commande: Order;
    details: any[];
  }>(`/detail_commande/${id}`);
  return response.data;
};

export const addReview = async (data: {
  product_id: number;
  stars: number;
  comment?: string;
}): Promise<Review> => {
  const response = await api.post<Review>('/add_review', data);
  return response.data;
};

// Redirections
export const getRedirections = async (): Promise<any[]> => {
  const response = await api.get('/redirections');
  return response.data;
};

export default api;
