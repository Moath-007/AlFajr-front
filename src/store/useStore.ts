import { useState, useCallback } from 'react';
import type { Product, Category, Representative, Order, OrderStatus, ShopSettings } from '@/types';
import {
  products as initialProducts,
  representatives as initialReps,
  orders as initialOrders,
  shopSettings as initialSettings,
} from '@/data/mockData';
import { categories as initialCategories } from '@/data/categories';

export type Notification = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

let nextOrderNum = 1025;

export function useStore() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [reps, setReps] = useState<Representative[]>(initialReps);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [settings, setSettings] = useState<ShopSettings>(initialSettings);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: Notification['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addProduct = useCallback((p: Omit<Product, 'id'>) => {
    const id = 'p' + Math.random().toString(36).slice(2, 8);
    setProducts((prev) => [...prev, { ...p, id }]);
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    const id = 'c' + Math.random().toString(36).slice(2, 8);
    setCategories((prev) => [...prev, { ...c, id }]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addRep = useCallback((r: Omit<Representative, 'id' | 'createdAt'>) => {
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    setReps((prev) => [...prev, { ...r, id, createdAt: new Date().toISOString().slice(0, 10) }]);
  }, []);

  const updateRep = useCallback((id: string, updates: Partial<Representative>) => {
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const toggleRepStatus = useCallback((id: string) => {
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }, []);

  const addOrder = useCallback((order: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>) => {
    const id = 'o' + Math.random().toString(36).slice(2, 8);
    const number = String(nextOrderNum++);
    const newOrder: Order = {
      ...order,
      id,
      number,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);

    // Reduce stock
    setProducts((prev) =>
      prev.map((p) => {
        if (!order.items.some((item) => item.productId === p.id)) return p;
        const updatedVariants = p.variants.map((v) => {
          const item = order.items.find(
            (item) => item.productId === p.id && item.size === v.size && item.color === v.color
          );
          if (item) return { ...v, stock: Math.max(0, v.stock - item.quantity) };
          return v;
        });
        return { ...p, variants: updatedVariants };
      })
    );
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }, []);

  const updateSettings = useCallback((updates: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    products,
    categories,
    reps,
    orders,
    settings,
    notifications,
    notify,
    dismissNotification,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addRep,
    updateRep,
    toggleRepStatus,
    addOrder,
    updateOrderStatus,
    updateSettings,
  };
}
