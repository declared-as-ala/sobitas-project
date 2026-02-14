'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';
import { toast } from 'sonner';
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Load cart from localStorage on mount
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
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToCart = (product: Product, quantity: number = 1) => {
    const stockDisponible = getStockDisponible(product as any);
    if (stockDisponible <= 0) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }

    const inCartQty = getCartQty(items, product.id);
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
        setCartDrawerOpen(true);
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
    setCartDrawerOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + getEffectivePrice(item.product) * item.quantity, 0);
  };

  const getCartQtyForProduct = (productId: number) => getCartQty(items, productId);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getEffectivePrice,
        getCartQty: getCartQtyForProduct,
        cartDrawerOpen,
        setCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
