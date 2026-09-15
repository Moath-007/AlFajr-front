import type { DecimalString, IsoDateTimeString, NumericId } from "./common";
import type { ApiOrderStatus, OrderType, PaymentStatus } from "./orders";

export interface AdminDashboardQuery {
  date_from?: string;
  date_to?: string;
  low_stock_threshold?: number;
}

export interface AdminDashboardSummaryDto {
  completed_sales_total: DecimalString;
  completed_orders_count: number;
  pending_orders_count: number;
  outstanding_amount: DecimalString;
  outstanding_orders_count: number;
}

export interface AdminDashboardOrdersByTypeDto {
  retail: number;
  wholesale: number;
  store_sale: number;
}

export interface AdminDashboardRecentOrderDto {
  order_id: NumericId;
  order_type: OrderType;
  status: ApiOrderStatus;
  payment_status: PaymentStatus;
  customer: { id: NumericId; name: string; phone: string };
  representative: { id: NumericId; name: string } | null;
  total_amount: DecimalString;
  paid_amount: DecimalString;
  remaining_amount: DecimalString;
  created_at: IsoDateTimeString;
}

export interface AdminDashboardStockAlertsDto {
  low_stock_variants: number;
  out_of_stock_variants: number;
}

export interface AdminDashboardRepresentativeDto {
  representative_id: NumericId;
  name: string;
  completed_orders_count: number;
  completed_sales_total: DecimalString;
}

export interface AdminDashboardResponseDto {
  summary: AdminDashboardSummaryDto;
  orders_by_type: AdminDashboardOrdersByTypeDto;
  recent_orders: AdminDashboardRecentOrderDto[];
  stock_alerts: AdminDashboardStockAlertsDto;
  representatives: AdminDashboardRepresentativeDto[];
  date_semantics: {
    timezone: "Asia/Hebron";
    default_range: "current_month_to_date";
    orders_by_type: "all_non_cancelled_in_selected_period";
    outstanding: "all_time_non_cancelled";
  };
}
