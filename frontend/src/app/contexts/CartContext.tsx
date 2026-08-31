'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  startTransition,
} from 'react';
import type { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';
import { notify as toast } from '@/lib/notify';
import { getEffectivePrice as getEffectivePriceUtil } from '@/util/productPrice';
import { getStockDisponible, getCartQty } from '@/util/cartStock';

// Support both Product types
type Product = ApiProduct | DataProduct;

export interface CartItem {
  product: Product;
  quantity: number;
}

/** Effective unit price: promo if valid (promo + no expiry or future expiration), else prix/price. Uses shared util. */
function getEffectivePrice(product: Product): number {
  return getEffectivePriceUtil(product as any);
}

interface CartContextType {
  items: CartItem[];
  /** True once the cart has been rehydrated from localStorage (avoid flashing the empty state). */
  isLoaded: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getEffectivePrice: (product: Product) => number;
  /** Quantité actuelle du produit dans le panier. */
  getCartQty: (productId: number) => number;
  /** Drawer open state: opens on add-to-cart (desktop and mobile). */
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  /** Opt-in bundle (pack) discount: when true, checkout requests the authoritative pack tier discount. */
  packDiscount: boolean;
  setPackDiscount: (value: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * ── THE INP FIX (field CWV, 2026-08-03: INP 408 ms, FAILING) ──────────────────────────────
 *
 * Lab said the site was fine — TBT 50 ms, "good". Field said INP 408 ms and a FAILED Core Web
 * Vitals assessment. That gap is the whole story: TBT measures blocking during LOAD, INP measures
 * how long a real tap takes to paint. A page can load fast and still be miserable to use.
 *
 * The cause, and it is structural rather than a slow function anywhere:
 *
 *   `value` here is memoised on [items, …]. Every add-to-cart changes `items`, so `value` becomes
 *   a new object, so EVERY component calling `useCart()` re-renders. `ProductCard` calls it — and
 *   the homepage renders 23 ProductCards. It also renders in HeaderClient (~1,050 lines, for a
 *   cart badge), MobileTabBar, CartDrawer and QuickOrderDrawer.
 *
 *   So one tap on "Ajouter" re-rendered 23 product cards plus the entire header. That work happens
 *   between the tap and the next paint, which is precisely what INP measures.
 *
 * Two contexts instead of one, split by HOW OFTEN THE VALUE CHANGES:
 *
 *   CartActionsContext   addToCart / removeFromCart / updateQuantity / clearCart / drawer /
 *                        packDiscount setter. Every function is referentially stable FOREVER, so
 *                        the object is created once and consumers of it NEVER re-render. This is
 *                        what `addToCart` had to stop depending on: it closed over `items`, which
 *                        is what forced it to be recreated on every cart change.
 *   CartQtyContext       a tiny external store. `useCartQty(id)` subscribes through
 *                        `useSyncExternalStore` and returns a NUMBER, so React's Object.is bailout
 *                        means a card only re-renders when ITS OWN quantity changes. Adding
 *                        product A no longer touches the other 22 cards.
 *
 * `useCart()` is unchanged and still returns everything, so the ~20 existing consumers (cart page,
 * checkout, drawers) keep working exactly as before. Only the components rendered N-times-per-page
 * were moved onto the narrow hooks — that is where all the cost was.
 */
type CartActions = Pick<
  CartContextType,
  'addToCart' | 'removeFromCart' | 'updateQuantity' | 'clearCart' | 'setCartDrawerOpen' | 'setPackDiscount'
>;
const CartActionsContext = createContext<CartActions | undefined>(undefined);

type CartQtyStore = {
  subscribe: (onChange: () => void) => () => void;
  getQty: (productId: number) => number;
  getCount: () => number;
};
const CartQtyContext = createContext<CartQtyStore | undefined>(undefined);

/**
 * Drawer open/closed, on its OWN context.
 *
 * It used to ride on the main cart value, which meant HeaderClient — ~1,050 lines holding the nav,
 * two dropdowns, the search island and the mobile sheet — re-rendered every time the drawer
 * opened, because that is where <CartDrawer> was mounted. Adding to the cart opens the drawer, so
 * every add-to-cart re-rendered the entire header inside the tap handler.
 *
 * The drawer now lives in its own leaf host (components/CartDrawerHost.tsx) mounted at the layout
 * level, and this context is the only thing that host subscribes to. The header keeps the cart
 * BADGE and takes it from `useCartCount()`, which is a number and therefore bails out unless the
 * count actually changed.
 */
type CartDrawerValue = { open: boolean; setOpen: (open: boolean) => void };
const CartDrawerContext = createContext<CartDrawerValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [packDiscount, setPackDiscountState] = useState(false);

  /*
   * The live cart, readable WITHOUT subscribing to it.
   *
   * Assigned during render rather than in an effect, deliberately: `useSyncExternalStore` calls
   * `getSnapshot` during the render pass that follows a state change, and an effect would not have
   * run yet — the store would hand back the previous quantity and the card would paint one tap
   * behind. Writing the ref during render is safe here because it mirrors state we already hold.
   */
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const listenersRef = useRef<Set<() => void>>(new Set());
  useEffect(() => {
    listenersRef.current.forEach((notify) => notify());
  }, [items]);

  const qtyStore = useMemo<CartQtyStore>(
    () => ({
      subscribe: (onChange) => {
        listenersRef.current.add(onChange);
        return () => {
          listenersRef.current.delete(onChange);
        };
      },
      getQty: (productId) => getCartQty(itemsRef.current, productId),
      getCount: () => itemsRef.current.reduce((total, item) => total + item.quantity, 0),
    }),
    []
  );

  // Load cart + pack-discount opt-in from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error loading cart from localStorage:', error);
        }
      }
      setPackDiscountState(localStorage.getItem('cart_pack_discount') === 'true');
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Persist the pack-discount opt-in flag
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cart_pack_discount', packDiscount ? 'true' : 'false');
    }
  }, [packDiscount, isLoaded]);

  const setPackDiscount = useCallback((value: boolean) => setPackDiscountState(value), []);

  /**
   * Open the drawer WITHOUT making the shopper wait for it.
   *
   * Measured on a 4x-throttled CPU (scripts/check-inp.mjs): the first add-to-cart took 848 ms with
   * 338 ms of it inside the click handler, while every other interaction on the page was 56-80 ms.
   * The cart drawer is `dynamic(ssr: false)`, so that first tap was paying to DOWNLOAD AND
   * EVALUATE the drawer chunk, then render the whole cart, all before the browser was allowed to
   * paint the button's own "Ajouté !" feedback.
   *
   * `startTransition` marks the drawer as non-urgent. The item lands in the cart and the button
   * updates in the very next frame — which is the frame INP stops the clock on — and the drawer
   * renders in a second, interruptible pass. Nothing is deferred except the part the shopper is
   * not waiting for, and the chunk itself is warmed on idle by CartDrawerHost so it is usually
   * already in memory by the time anyone taps.
   */
  const openDrawerDeferred = useCallback(() => {
    const open = () => {
      startTransition(() => setCartDrawerOpen(true));
    };

    // A transition can still be completed before the browser presents the urgent "Ajouté !"
    // state. Cross one paint boundary explicitly, then mount the already-warmed drawer.
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.requestAnimationFrame(open));
      return;
    }
    setTimeout(open, 0);
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const stockDisponible = getStockDisponible(product as any);
    if (stockDisponible <= 0) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }

    // `itemsRef`, NOT `items`. Reading the state variable here is what put `[items]` in this
    // callback's dependency list, which recreated `addToCart` on every cart change, which
    // recreated the context value, which re-rendered all 23 cards. The ref is always current
    // (assigned during render above), so this reads exactly the same data with no subscription.
    const inCartQty = getCartQty(itemsRef.current, product.id);
    const requestedTotal = inCartQty + quantity;
    if (requestedTotal > stockDisponible) {
      const restant = Math.max(0, stockDisponible - inCartQty);
      toast.error(
        `Stock insuffisant. Il reste ${restant} unité${restant !== 1 ? 's' : ''}.`
      );
      if (restant > 0) {
        setItems(prevItems => {
          const existing = prevItems.find(item => item.product.id === product.id);
          const newQty = inCartQty + restant;
          if (existing) {
            return prevItems.map(item =>
              item.product.id === product.id ? { ...item, quantity: newQty } : item
            );
          }
          return [...prevItems, { product, quantity: restant }];
        });
        openDrawerDeferred();
      }
      return;
    }

    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { product, quantity }];
    });
    openDrawerDeferred();
    // `openDrawerDeferred` is itself lifetime-stable, so this callback remains lifetime-stable.
  }, [openDrawerDeferred]);

  const removeFromCart = useCallback((productId: number) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setPackDiscountState(false);
  }, []);

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => total + getEffectivePrice(item.product) * item.quantity, 0);
  }, [items]);

  const getCartQtyForProduct = useCallback((productId: number) => getCartQty(items, productId), [items]);

  const setCartDrawerOpenStable = useCallback((open: boolean) => setCartDrawerOpen(open), []);

  const value = useMemo(() => ({
    items,
    isLoaded,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    getEffectivePrice,
    getCartQty: getCartQtyForProduct,
    cartDrawerOpen,
    setCartDrawerOpen: setCartDrawerOpenStable,
    packDiscount,
    setPackDiscount,
  }), [items, isLoaded, cartDrawerOpen, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice, getCartQtyForProduct, setCartDrawerOpenStable, packDiscount, setPackDiscount]);

  /*
   * Every member is stable for the provider's lifetime, so this object is built ONCE and every
   * `useCartActions()` consumer is permanently insulated from cart state changes. If a function is
   * ever added here with a non-empty dependency list, that is a silent INP regression — the whole
   * point of this object is that it never changes identity.
   */
  const actions = useMemo<CartActions>(
    () => ({
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      setCartDrawerOpen: setCartDrawerOpenStable,
      setPackDiscount,
    }),
    [addToCart, removeFromCart, updateQuantity, clearCart, setCartDrawerOpenStable, setPackDiscount]
  );

  const drawer = useMemo<CartDrawerValue>(
    () => ({ open: cartDrawerOpen, setOpen: setCartDrawerOpenStable }),
    [cartDrawerOpen, setCartDrawerOpenStable]
  );

  return (
    <CartContext.Provider value={value}>
      <CartActionsContext.Provider value={actions}>
        <CartQtyContext.Provider value={qtyStore}>
          <CartDrawerContext.Provider value={drawer}>{children}</CartDrawerContext.Provider>
        </CartQtyContext.Provider>
      </CartActionsContext.Provider>
    </CartContext.Provider>
  );
}

/**
 * The FULL cart. Re-renders on every cart change — correct for the cart page, the drawer and
 * checkout, which all display the contents.
 *
 * Do NOT use this in a component that is rendered once per product in a grid. Use
 * `useCartActions()` + `useCartQty(id)` instead; see the note above CartProvider.
 */
/**
 * Cart MUTATORS only, and they never change identity — so a component using this hook is never
 * re-rendered by anyone else's cart activity. This is what a product card wants.
 */
export function useCartActions(): CartActions {
  const ctx = useContext(CartActionsContext);
  if (ctx === undefined) throw new Error('useCartActions must be used within a CartProvider');
  return ctx;
}

/**
 * The quantity of ONE product in the cart, as a narrow subscription.
 *
 * `useSyncExternalStore` re-renders only when the snapshot changes by `Object.is`, and the
 * snapshot here is a number. So a grid of 23 cards subscribed to 23 different products produces
 * exactly ONE re-render when one of them is added — not 23. That is the whole INP fix.
 *
 * The third argument is the SERVER snapshot and must be a constant: the cart lives in
 * localStorage, so it is empty during SSR by definition, and returning anything else here would
 * be a hydration mismatch.
 */
export function useCartQty(productId: number): number {
  const store = useContext(CartQtyContext);
  if (store === undefined) throw new Error('useCartQty must be used within a CartProvider');
  return useSyncExternalStore(
    store.subscribe,
    () => store.getQty(productId),
    () => 0
  );
}

/**
 * Total number of items in the cart, as a narrow subscription — for badges.
 *
 * A number, so the header's badge only re-renders when the count actually changes, and never
 * because some other part of the cart moved.
 */
export function useCartCount(): number {
  const store = useContext(CartQtyContext);
  if (store === undefined) throw new Error('useCartCount must be used within a CartProvider');
  return useSyncExternalStore(
    store.subscribe,
    () => store.getCount(),
    () => 0
  );
}

/** Drawer open state only. Subscribed to by CartDrawerHost, and by nothing else. */
export function useCartDrawer(): CartDrawerValue {
  const ctx = useContext(CartDrawerContext);
  if (ctx === undefined) throw new Error('useCartDrawer must be used within a CartProvider');
  return ctx;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
