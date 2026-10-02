import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";
export type ApiOrderStatus = "Pending" | "Completed" | "Cancelled";
export type PaymentMethod = "Cash" | "Check";
export interface InvoiceItemDto {
  product_variant_id: NumericId;
  quantity: number;
  unit_price: number;
  product_discount?: number;
  is_bonus?: boolean;
}
export interface InvoiceDto {
  customer_id?: NumericId | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  order_discount?: number;
  items: InvoiceItemDto[];
}
export interface CreateInvoiceDto extends InvoiceDto {
  sale_account_id: NumericId;
}
export interface UpdateOrderDto extends InvoiceDto {
  sale_account_id?: NumericId;
}
export interface CreateOnlineOrderDto {
  customer_name: string;
  phone: string;
  notes?: string;
  items: Array<{ product_variant_id: NumericId; quantity: number }>;
}
export interface OrderActionDataDto {
  order_id: NumericId;
  status: ApiOrderStatus;
  sale_account_id: NumericId | null;
  total_amount: DecimalString;
  order_discount: DecimalString;
}
export interface OrderActionResponseDto {
  message: string;
  order: OrderActionDataDto;
}
export interface OrderCustomerResponseDto {
  id: NumericId;
  name: string;
  phone: string;
  email?: string | null;
}
export interface OrderCreatorResponseDto {
  id: NumericId;
  name: string;
  phone?: string | null;
  email: string;
}
export interface OrderVariantResponseDto {
  id: NumericId;
  size: string;
  color: { id: NumericId; name: string };
  product: { id: NumericId; name: string; code: string };
}
export interface OrderItemResponseDto {
  id: NumericId;
  quantity: number;
  unit_price: DecimalString;
  product_discount: DecimalString;
  line_total: DecimalString;
  is_bonus: boolean;
  variant: OrderVariantResponseDto;
}
export interface OrderResponseDto {
  id: NumericId;
  status: ApiOrderStatus;
  sale_account_id: NumericId | null;
  sale_account: { id: NumericId; name: string; kind: string } | null;
  created_by: NumericId | null;
  creator: OrderCreatorResponseDto | null;
  customer: OrderCustomerResponseDto | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  delivery_address: string | null;
  notes: string | null;
  total_amount: DecimalString;
  order_discount: DecimalString;
  created_at: IsoDateTimeString;
  items: OrderItemResponseDto[];
}
export interface OrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApiOrderStatus;
  customer_id?: NumericId;
  created_by?: NumericId;
  date_from?: string;
  date_to?: string;
  min_total?: number;
  max_total?: number;
  sort_by?: "created_at" | "total_amount";
  sort_order?: "asc" | "desc";
}
export type OrdersPaginationDto = PaginationResponseDto;
export type OrderListItemResponseDto = OrderResponseDto;
export interface OrdersSummaryListResponseDto {
  message: string;
  orders: OrderResponseDto[];
  pagination: OrdersPaginationDto;
}
export interface RepresentativeOrderStatsDto {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  completed_sales_total: DecimalString;
}
export interface RepresentativeOrderStatsResponseDto {
  message: string;
  stats: RepresentativeOrderStatsDto;
}
export interface OrderMessageResponseDto {
  message: string;
}
export interface OrderDetailsResponseDto {
  message: string;
  order: OrderResponseDto;
}
