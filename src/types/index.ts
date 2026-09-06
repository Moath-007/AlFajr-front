export type ID = string;

export interface ColorOption {
  name: string;
  hex: string;
}

// تم تحديث الواجهة لتشمل سعر الجملة لكل مقاس
export interface SizeOption {
  size: string;
  price: number;
  wholesalePrice: number;
}

export interface Variant {
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: ID;
  name: string;
  code: string;
  price: number;
  wholesalePrice: number; // تمت إضافة سعر الجملة الأساسي للمنتج
  description: string;
  weight: string;
  categoryId: ID;
  sizes: SizeOption[];
  colors: ColorOption[];
  variants: Variant[];
  image: string;
  images?: string[];
}

export interface Category {
  id: ID;
  name: string;
  description: string;
  icon: string;
}

export interface Representative {
  id: ID;
  name: string;
  phone: string;
  username: string;
  password: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: ID;
  productName: string;
  productCode: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Order {
  id: ID;
  number: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  repId: ID;
  repName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface ShopSettings {
  name: string;
  phones: string[];
  address: string;
  email: string;
  workingHours: string;
  city: string;
}

export type Role = 'public' | 'rep' | 'owner';