import { apiClient } from "../client";
import type {
  InventoryListResponseDto,
  InventoryQuery,
  InventoryAdjustmentDto,
  InventoryAdjustmentResponseDto,
  InventoryMovementsResponseDto,
} from "../types";

export const inventoryService = {
  list: (query: InventoryQuery = {}, signal?: AbortSignal) =>
    apiClient.get<InventoryListResponseDto>(withQuery("/inventory", query), {
      signal,
    }),
  adjust: (
    variantId: number,
    data: InventoryAdjustmentDto,
    signal?: AbortSignal,
  ) =>
    apiClient.post<InventoryAdjustmentResponseDto>(
      `/inventory/${variantId}/adjustments`,
      data,
      { signal },
    ),
  movements: (variantId: number, signal?: AbortSignal) =>
    apiClient.get<InventoryMovementsResponseDto>(`/inventory/${variantId}/movements`, { signal }),
};

function withQuery(path: string, query: InventoryQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
