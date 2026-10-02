import { apiClient } from "../client";
import type {
  InventoryListResponseDto,
  InventoryQuery,
  OpeningStockInputDto,
  OpeningStockResponseDto,
  InventoryMovementsQuery,
  InventoryMovementsResponseDto,
} from "../types";

export const inventoryService = {
  cost: (variantId: number) =>
    apiClient.get<{
      product_variant_id: number;
      stock_quantity: number;
      average_cost: string | null;
      openings: { id: number; quantity: number; unit_cost: string }[];
    }>(`/inventory/${variantId}/cost`),
  openingStock: (variantId: number, data: OpeningStockInputDto) =>
    apiClient.post<OpeningStockResponseDto>(
      `/inventory/${variantId}/opening-stock`,
      data,
    ),
  editOpening: (
    variantId: number,
    eventId: number,
    data: OpeningStockInputDto,
  ) =>
    apiClient.put<{ message: string }>(
      `/inventory/${variantId}/opening-stock/${eventId}`,
      data,
    ),
  cancelOpening: (variantId: number, eventId: number) =>
    apiClient.delete<{ message: string }>(
      `/inventory/${variantId}/opening-stock/${eventId}`,
    ),
  list: (query: InventoryQuery = {}, signal?: AbortSignal) =>
    apiClient.get<InventoryListResponseDto>(withQuery("/inventory", query), {
      signal,
    }),
  movements: (
    variantId: number,
    query: InventoryMovementsQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<InventoryMovementsResponseDto>(
      withQuery(`/inventory/${variantId}/movements`, query),
      { signal },
    ),
};

function withQuery(
  path: string,
  query: InventoryQuery | InventoryMovementsQuery,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
