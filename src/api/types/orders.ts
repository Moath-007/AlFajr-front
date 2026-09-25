import type {
  DecimalString,
  IsoDateTimeString,
  NumericId,
  PaginationResponseDto,
} from "./common";

export type OrderType = "Retail" | "Wholesale" | "StoreSale";
export type ApiOrderStatus = "Pending" | "Completed" | "Cancelled";
export type PaymentMethod = "Cash" | "Check";

export interface OrderItemDto {
  product_variant_id: NumericId;
  quantity: number;
  unit_price?: number;
  is_bonus?: boolean;
}

export type RetailOrderItemDto = OrderItemDto;
export type WholesaleOrderItemDto = OrderItemDto;
export type StoreSaleOrderItemDto = OrderItemDto;

export interface CreateRetailOrderDto {
  customer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  notes?: string;
  items: RetailOrderItemDto[];
}

export interface WholesalePaymentDto {
  amount: number;
  payment_method: PaymentMethod;
  check_number?: string;
  account_number?: string;
  bank_number?: string;
  branch_number?: string;
  due_date?: string;
  notes?: string;
}

export interface CreateWholesaleOrderDto {
  customer_name: string;
  phone: string;
  email?: string;
  delivery_address?: string;
  order_discount?: number;
  notes?: string;
  items: WholesaleOrderItemDto[];
  payments?: WholesalePaymentDto[];
}

export interface CreateStoreSaleOrderDto {
  customer_name: string;
  phone: string;
  email?: string;
  order_discount?: number;
  notes?: string;
  items: StoreSaleOrderItemDto[];
}

export interface OrderActionDataDto {
  order_id: NumericId;
  customer_id: NumericId;
  representative_id?: NumericId | null;
  order_type: OrderType;
  status: ApiOrderStatus;
  total_amount: DecimalString;
  order_discount: DecimalString;
  delivery_address?: string | null;
  notes?: string | null;
  created_at: IsoDateTimeString;
}

export interface OrderActionResponseDto {
  message: string;
  order: OrderActionDataDto;
}

export interface UpdateOrderStatusDto {
  status: Extract<ApiOrderStatus, "Completed" | "Cancelled">;
}

export interface OrderCustomerResponseDto {
  id: NumericId;
  name: string;
  phone: string;
  email?: string | null;
}

export interface OrderRepresentativeResponseDto {
  id: NumericId;
  name: string;
  phone?: string | null;
  email: string;
}

export interface OrderColorResponseDto {
  id: NumericId;
  name: string;
}

export interface OrderProductResponseDto {
  id: NumericId;
  name: string;
  code: string;
}

export interface OrderVariantResponseDto {
  id: NumericId;
  size: string;
  color: OrderColorResponseDto;
  product: OrderProductResponseDto;
}

export interface OrderItemResponseDto {
  id: NumericId;
  quantity: number;
  unit_price: DecimalString;
  base_unit_price: DecimalString;
  product_discount: DecimalString;
  line_total: DecimalString;
  is_bonus: boolean;
  variant: OrderVariantResponseDto;
}

export interface OrderResponseDto {
  id: NumericId;
  order_type: OrderType;
  status: ApiOrderStatus;
  total_amount: DecimalString;
  order_discount: DecimalString;
  delivery_address?: string | null;
  notes?: string | null;
  created_at: IsoDateTimeString;
  customer: OrderCustomerResponseDto;
  representative?: OrderRepresentativeResponseDto | null;
  items: OrderItemResponseDto[];
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApiOrderStatus;
  order_type?: OrderType;
  customer_id?: NumericId;
  representative_id?: NumericId;
  date_from?: string;
  date_to?: string;
  min_total?: number;
  max_total?: number;
  sort_by?: "created_at" | "total_amount";
  sort_order?: "asc" | "desc";
}

export type OrdersPaginationDto = PaginationResponseDto;

export interface OrderListCustomerDto {
  id: NumericId;
  name: string;
  phone: string;
}
export interface OrderListRepresentativeDto {
  id: NumericId;
  name: string;
}

export interface OrderListItemResponseDto {
  id: NumericId;
  order_type: OrderType;
  status: ApiOrderStatus;
  customer: OrderListCustomerDto;
  representative?: OrderListRepresentativeDto | null;
  total_amount: DecimalString;
  created_at: IsoDateTimeString;
}

export interface OrdersSummaryListResponseDto {
  message: string;
  orders: OrderListItemResponseDto[];
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

export interface UpdateOrderPaymentDto {
  payment_id?: NumericId;
  amount: number;
  payment_method: PaymentMethod;
  check_number?: string;
  notes?: string;
}

export interface UpdateOrderDto {
  customer_name: string;
  phone: string;
  email?: string;
  delivery_address?: string;
  notes?: string;
  order_discount?: number;
  items: UpdateOrderItemDto[];
}

export interface UpdateOrderItemDto {
  product_variant_id: NumericId;
  quantity: number;
  unit_price?: number;
  is_bonus?: boolean;
}

export interface OrderDetailsResponseDto {
  message: string;
  order: OrderResponseDto;
}

