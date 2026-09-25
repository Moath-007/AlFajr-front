import type { DecimalString, IsoDateTimeString, NumericId } from "./common";
import type { ApiOrderStatus, OrderType } from "./orders";

export interface AdminDashboardQuery {
  range?: "current_month" | "all_time";
  date_from?: string;
  date_to?: string;
  low_stock_threshold?: number;
}

export interface AdminDashboardSummaryDto {
  completed_sales_total: DecimalString;
  completed_orders_count: number;
  pending_orders_count: number;
  pending_orders_total: DecimalString;
  outstanding_amount: DecimalString;
  outstanding_orders_count: number;
  outstanding_debts_count: number;
}

export interface AdminDashboardOrdersByTypeDto {
  retail: number;
  wholesale: number;
  store_sale: number;
}
export interface AdminDashboardSalesByTypeDto {
  retail: DecimalString;
  wholesale: DecimalString;
  store_sale: DecimalString;
}

export interface AdminDashboardRecentOrderDto {
  order_id: NumericId;
  order_type: OrderType;
  status: ApiOrderStatus;
  customer: { id: NumericId; name: string; phone: string };
  representative: { id: NumericId; name: string } | null;
  total_amount: DecimalString;
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
  collections: { total: DecimalString; cash: DecimalString; checks: DecimalString };
  checks: {
    pending: { count: number; amount: DecimalString };
    collected: { count: number; amount: DecimalString };
    returned: { count: number; amount: DecimalString };
  };
  customer_accounts: {
    receivable: DecimalString;
    receivable_customers_count: number;
    customer_credit: DecimalString;
    customer_credit_customers_count: number;
    customer_purchases: DecimalString;
    disbursements: DecimalString;
    added_debts: DecimalString;
    write_offs: DecimalString;
  };
  orders_by_type: AdminDashboardOrdersByTypeDto;
  sales_by_type: AdminDashboardSalesByTypeDto;
  recent_orders: AdminDashboardRecentOrderDto[];
  stock_alerts: AdminDashboardStockAlertsDto;
  representatives: AdminDashboardRepresentativeDto[];
  date_semantics: {
    timezone: "Asia/Hebron";
    default_range: "current_month_to_date" | "all_time";
    orders_by_type: "all_non_cancelled_in_selected_period";
    outstanding: "all_time_non_cancelled";
  };
}
