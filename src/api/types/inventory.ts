import type { NumericId, PaginationResponseDto } from "./common";
import type { StockStatus } from "./products";

export interface InventoryCategoryDto {
  id: NumericId;
  name: string;
}
export interface InventoryColorDto {
  id: NumericId;
  name: string;
}
export interface InventoryProductDto {
  id: NumericId;
  name: string;
  code: string;
  is_active: boolean;
}
export interface InventoryItemDto {
  product_variant_id: NumericId;
  product: InventoryProductDto;
  category: InventoryCategoryDto;
  size: string;
  color: InventoryColorDto;
  stock_quantity: number;
}
export interface InventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: NumericId;
  color_id?: NumericId;
  stock_status?: StockStatus | "in" | "low" | "out";
  threshold?: number;
  sort_by?: "stock_quantity" | "product_name" | "code";
  sort_order?: "asc" | "desc";
}
export interface InventoryListResponseDto {
  message: string;
  items: InventoryItemDto[];
  pagination: PaginationResponseDto;
}
export interface InventoryMovementDto { inventory_movement_id: NumericId; product_variant_id: NumericId; quantity_change: number; source_type: string; order_id?: NumericId | null; customer_purchase_id?: NumericId | null; notes?: string | null; created_at: string; users?: { user_id: NumericId; name: string } | null; }
export type InventoryMovementsResponseDto = InventoryMovementDto[] | { message?: string; items?: InventoryMovementDto[]; movements?: InventoryMovementDto[]; };
export interface InventoryAdjustmentDto { quantity_change: number; notes?: string; }
export interface InventoryAdjustmentResponseDto { message: string; quantity_change: number; item: InventoryItemDto; }
