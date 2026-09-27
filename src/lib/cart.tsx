import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products, type Product } from "./store";

type CartItem = { product: Product; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (productId: string, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "kazza-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setQuantities(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
  }, [quantities, loaded]);

  const value = useMemo<CartContextValue>(() => {
    const items = Object.entries(quantities)
      .map(([id, quantity]) => ({ product: products.find((p) => p.id === id)!, quantity }))
      .filter((item) => item.product && item.quantity > 0);

    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      total: items.reduce(
        (sum, i) => sum + (i.product.salePrice ?? i.product.price) * i.quantity,
        0,
      ),
      open,
      setOpen,
      add: (id, quantity = 1) => {
        setQuantities((q) => ({ ...q, [id]: (q[id] ?? 0) + quantity }));
        setOpen(true);
      },
      remove: (id) =>
        setQuantities((q) => {
          const { [id]: _, ...rest } = q;
          return rest;
        }),
      setQuantity: (id, quantity) =>
        setQuantities((q) => {
          if (quantity <= 0) {
            const { [id]: _, ...rest } = q;
            return rest;
          }
          return { ...q, [id]: quantity };
        }),
    };
  }, [quantities, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a <CartProvider />");
  return ctx;
}
