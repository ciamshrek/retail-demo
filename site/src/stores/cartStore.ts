import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getOrCreateSessionId } from "~/utils/session";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  sessionId: string | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  openCart: () => void;
  getSessionId: () => string;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      sessionId: null,
      getSessionId: () => {
        const currentSessionId = get().sessionId;
        if (currentSessionId) {
          return currentSessionId;
        }
        
        const newSessionId = getOrCreateSessionId();
        set({ sessionId: newSessionId });
        return newSessionId;
      },
      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === newItem.productId
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === newItem.productId
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { ...newItem, id: `${newItem.productId}-${Date.now()}` },
            ],
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      closeCart: () => set({ isOpen: false }),
      openCart: () => set({ isOpen: true }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        sessionId: state.sessionId,
      }),
    }
  )
);

// Computed values as custom hooks
export const useCartTotal = () => {
  const items = useCartStore((state) => state.items);
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

export const useCartItemCount = () => {
  const items = useCartStore((state) => state.items);
  return items.reduce((count, item) => count + item.quantity, 0);
};
