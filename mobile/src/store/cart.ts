import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: number;
  name: string;
  cover: string | null;
  price: number;
  promoPrice: number | null;
  quantity: number;
  slug: string;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discountAmount: number;
  
  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string | null, discountAmount: number) => void;
  
  getCartTotal: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discountAmount: 0,

      addItem: (product) => {
        const items = [...get().items];
        const existingItem = items.find((item) => item.id === product.id);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          items.push({ ...product, quantity: 1 });
        }

        set({ items });
      },

      removeItem: (id) => {
        const items = get().items.filter((item) => item.id !== id);
        set({ items });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        const items = get().items.map((item) => {
          if (item.id === id) {
            return { ...item, quantity };
          }
          return item;
        });

        set({ items });
      },

      clearCart: () => set({ items: [], couponCode: null, discountAmount: 0 }),

      setCoupon: (code, discountAmount) => set({ couponCode: code, discountAmount }),

      getCartTotal: () => {
        const subtotal = get().items.reduce((total, item) => {
          const itemPrice = item.promoPrice ?? item.price;
          return total + itemPrice * item.quantity;
        }, 0);
        
        return Math.max(0, subtotal - get().discountAmount);
      },

      getItemsCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'protein-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
