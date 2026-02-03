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
export const getStorageUrl = (path?: string): string => {
  if (!path) return '';
  const base = STORAGE_URL.replace(/\/$/, '');
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const pathPart = u.pathname.replace(/^\/storage\/?/, '');
        return pathPart ? `${base}/${pathPart}` : base;
      }
    } catch {
      /* ignore parse errors */
    }
    return path;
  }
  const clean = path.replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : base;
};

// ==================== PUBLIC API ENDPOINTS ====================

// Homepage & Accueil
export const getAccueil = async (): Promise<AccueilData> => {
  const response = await api.get<AccueilData>('/accueil');
  return response.data;
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
  const response = await api.get('/all_products');
  return response.data;
};

export const getProductDetails = async (slug: string, cacheBust?: boolean): Promise<Product> => {
  // Remove any query parameters from slug if present
  const cleanSlug = slug.split('?')[0];
  const url = cacheBust
    ? `/product_details/${cleanSlug}?t=${Date.now()}`
    : `/product_details/${cleanSlug}`;
  const response = await api.get<Product>(url);
  return response.data;
};

export const getProductsByCategory = async (slug: string): Promise<{
  category: Category;
  sous_categories: any[];
  products: Product[];
  brands: Brand[];
}> => {
  try {
    const response = await api.get(`/productsByCategoryId/${slug}`);
    return response.data;
  } catch (error: any) {
    // If 404, return empty data instead of throwing
    if (error.response?.status === 404) {
      console.warn(`Category "${slug}" not found, returning empty results`);
      return {
        category: {} as Category,
        sous_categories: [],
        products: [],
        brands: [],
      };
    }
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
    return response.data;
  } catch (error: any) {
    // If 404, return empty data instead of throwing
    if (error.response?.status === 404) {
      console.warn(`Subcategory "${slug}" not found, returning empty results`);
      return {
        sous_category: null,
        products: [],
        brands: [],
        sous_categories: [],
      };
    }
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

// Articles/Blog
export const getAllArticles = async (): Promise<Article[]> => {
  const response = await api.get('/all_articles');
  return response.data;
};

export const getArticleDetails = async (slug: string): Promise<Article> => {
  const response = await api.get<Article>(`/article_details/${slug}`);
  return response.data;
};

export const getLatestArticles = async (): Promise<Article[]> => {
  const response = await api.get<Article[]>('/latest_articles');
  return response.data;
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
  // Use Next.js API route as proxy in development to avoid CORS issues
  const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  if (isDevelopment) {
    // Use Next.js API route proxy
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
  } else {
    // Use direct API call in production
    const response = await api.post('/add_commande', orderData);
    return response.data;
  }
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
