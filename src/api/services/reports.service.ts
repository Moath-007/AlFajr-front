import { apiClient } from "../client";
import type {
  InventoryReportQuery,
  InventoryReportResponseDto,
  InventoryReportMovementsQuery,
  InventoryReportMovementsResponseDto,
  ChecksSnapshotReportQuery,
  ChecksSnapshotReportResponseDto,
  ChecksMovementsReportQuery,
  ChecksMovementsReportResponseDto,
  ProductsReportQuery,
  ProductsReportResponseDto,
  CustomerBalancesReportQuery,
  CustomerBalancesReportResponseDto,
  RepresentativesReportQuery,
  RepresentativesReportResponseDto,
  SalesReportResponseDto,
  SalesReportQuery,
  CollectionsReportQuery,
  CollectionsReportResponseDto,
  WriteOffsReportQuery,
  WriteOffsReportResponseDto,
  ReturnsReportQuery,
  ReturnsReportResponseDto,
} from "../types";

export const reportsService = {
  sales: (query: SalesReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<SalesReportResponseDto>(withQuery("/reports/sales", query), {
      signal,
    }),
  collections: (query: CollectionsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<CollectionsReportResponseDto>(withQuery("/reports/collections", query), { signal }),
  customerBalances: (query: CustomerBalancesReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<CustomerBalancesReportResponseDto>(withQuery('/reports/customer-balances', query), { signal }),
  returns: (query: ReturnsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ReturnsReportResponseDto>(withQuery("/reports/returns", query), { signal }),
  writeOffs: (query: WriteOffsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<WriteOffsReportResponseDto>(withQuery('/reports/write-offs', query), { signal }),
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
  inventoryMovements: (query: InventoryReportMovementsQuery = {}, signal?: AbortSignal) =>
    apiClient.get<InventoryReportMovementsResponseDto>(withQuery('/reports/inventory/movements', query), { signal }),
  checks: (query: ChecksSnapshotReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ChecksSnapshotReportResponseDto>(withQuery('/reports/checks', query), { signal }),
  checkMovements: (query: ChecksMovementsReportQuery = {}, signal?: AbortSignal) =>
    apiClient.get<ChecksMovementsReportResponseDto>(withQuery('/reports/checks/movements', query), { signal }),
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
