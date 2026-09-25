import { apiClient } from "../client";
import type {
  GroupedReportQuery,
  InventoryReportQuery,
  InventoryReportResponseDto,
  OrdersReportResponseDto,
  ProductsReportQuery,
  ProductsReportResponseDto,
  ReceivablesReportQuery,
  ReceivablesReportResponseDto,
  RepresentativesReportQuery,
  RepresentativesReportResponseDto,
  SalesReportResponseDto,
  DiscountsReportResponseDto,
  DateReportQuery,
  ReturnsReportQuery,
  ReturnsReportResponseDto,
} from "../types";

export const reportsService = {
  sales: (query: GroupedReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<SalesReportResponseDto>(withQuery("/reports/sales", query), {
      signal,
    }),
  orders: (query: GroupedReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<OrdersReportResponseDto>(
      withQuery("/reports/orders", query),
      { signal },
    ),
  receivables: (query: ReceivablesReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ReceivablesReportResponseDto>(
      withQuery("/reports/receivables", query),
      { signal },
    ),
  returns: (query: ReturnsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ReturnsReportResponseDto>(withQuery("/reports/returns", query), { signal }),
  discounts: (query: DateReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<DiscountsReportResponseDto>(withQuery("/reports/discounts", query), { signal }),
  products: (query: ProductsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ProductsReportResponseDto>(
      withQuery("/reports/products", query),
      { signal },
    ),
  inventory: (query: InventoryReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<InventoryReportResponseDto>(
      withQuery("/reports/inventory", query),
      { signal },
    ),
  representatives: (
    query: RepresentativesReportQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<RepresentativesReportResponseDto>(
      withQuery("/reports/representatives", query),
      { signal },
    ),
};
function withQuery(path: string, query: object) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
