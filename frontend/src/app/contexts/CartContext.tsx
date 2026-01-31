'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';
import { toast } from 'sonner';
import { getEffectivePrice as getEffectivePriceUtil } from '@/util/productPrice';

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
    // Check if product is out of stock: rupture === 1 means in stock, !== 1 means out of stock
    const isInStock = (product as any).rupture === 1 || (product as any).rupture === undefined;
    
    if (!isInStock) {
      toast.error('Rupture de stock - Ce produit n\'est pas disponible');
      return;
    }
    
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Check if adding more would exceed stock (if stock is tracked)
        // For now, just update quantity if item already exists
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        return [...prevItems, { product, quantity }];
      }
    });
    // Open cart drawer on add-to-cart (desktop and mobile)
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
