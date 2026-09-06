import type { Product, OrderStatus } from '@/types';

export function formatPrice(n: number): string {
  return `₪${n.toLocaleString('en-US')}`;
}

export function getStockLevel(product: Product): 'available' | 'limited' | 'out' {
  const total = product.variants.reduce((sum, v) => sum + v.stock, 0);
  if (total === 0) return 'out';
  if (total <= 10) return 'limited';
  return 'available';
}

export function getStockLabel(level: ReturnType<typeof getStockLevel>): string {
  switch (level) {
    case 'available': return 'متوفر';
    case 'limited': return 'كمية محدودة';
    case 'out': return 'غير متوفر';
  }
}

export function getVariantStock(product: Product, size: string, color: string): number {
  const v = product.variants.find((v) => v.size === size && v.color === color);
  return v ? v.stock : 0;
}

export function getTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'قيد الانتظار';
    case 'completed': return 'مكتمل';
    case 'cancelled': return 'ملغي';
  }
}

export function getStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'badge-gold';
    case 'completed': return 'badge-green';
    case 'cancelled': return 'badge-red';
  }
}
