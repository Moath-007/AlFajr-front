import type { DecimalString, NumericId, PaginationResponseDto } from "./common";
import type { InventoryListResponseDto, InventoryQuery } from "./inventory";
import type { OrderType } from "./orders";

export type ReportGroupBy = "day" | "week" | "month";
export interface DateReportQuery {
  date_from?: string;
  date_to?: string;
}
export interface GroupedReportQuery extends DateReportQuery {
  group_by?: ReportGroupBy;
}

export interface SalesReportSummaryDto {
  sales_total: DecimalString;
  orders_count: number;
  average_order_value: DecimalString;
}
export interface SalesReportTypeSummaryDto {
  sales_total: DecimalString;
  orders_count: number;
}
export interface SalesReportSeriesItemDto {
  period: string;
  sales_total: DecimalString;
  orders_count: number;
}
export interface SalesReportResponseDto {
  summary: SalesReportSummaryDto;
  by_type: {
    retail: SalesReportTypeSummaryDto;
    wholesale: SalesReportTypeSummaryDto;
    store_sale: SalesReportTypeSummaryDto;
  };
  series: SalesReportSeriesItemDto[];
}

export interface OrdersReportSeriesItemDto {
  period: string;
  orders_count: number;
}
export interface OrdersReportResponseDto {
  by_status: { pending: number; completed: number; cancelled: number };
  by_type: { retail: number; wholesale: number; store_sale: number };
  series: OrdersReportSeriesItemDto[];
}

export interface ReceivablesReportQuery extends DateReportQuery {
  order_type?: OrderType;
  representative_id?: NumericId;
}
export interface ReceivablesReportResponseDto {
  invoiced_amount: DecimalString;
  paid_amount: DecimalString;
  remaining_amount: DecimalString;
  outstanding_orders_count: number;
  unpaid_orders_count: number;
  partially_paid_orders_count: number;
}

export interface ProductsReportQuery extends DateReportQuery {
  rank_by?: "quantity" | "revenue";
  page?: number;
  limit?: number;
  product_id?: NumericId;
  category_id?: NumericId;
}
export type ReportPaginationDto = PaginationResponseDto;
export interface ProductReportRowDto {
  product_id: NumericId;
  name: string;
  code: string;
  quantity_sold: number;
  revenue: DecimalString;
}
export interface ProductsReportResponseDto {
  products: ProductReportRowDto[];
  pagination: ReportPaginationDto;
}

export type InventoryReportQuery = InventoryQuery;
export type InventoryReportResponseDto = InventoryListResponseDto;

export interface RepresentativesReportQuery extends DateReportQuery {
  representative_id?: NumericId;
  page?: number;
  limit?: number;
  sort_by?: "completed_sales_total" | "completed_orders_count" | "name";
  sort_order?: "asc" | "desc";
}
export interface RepresentativeReportRowDto {
  representative_id: NumericId;
  name: string;
  completed_orders_count: number;
  pending_orders_count: number;
  completed_sales_total: DecimalString;
  paid_amount: DecimalString;
  remaining_amount: DecimalString;
}
export interface RepresentativesReportResponseDto {
  representatives: RepresentativeReportRowDto[];
  pagination: ReportPaginationDto;
}
