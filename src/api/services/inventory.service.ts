import { apiClient } from "../client";
import type {
  InventoryListResponseDto,
  InventoryQuery,
  UpdateStockDto,
  UpdateStockResponseDto,
} from "../types";

export const inventoryService = {
  list: (query: InventoryQuery = {}, signal?: AbortSignal) =>
    apiClient.get<InventoryListResponseDto>(withQuery("/inventory", query), {
      signal,
    }),
  updateStock: (
    variantId: number,
    data: UpdateStockDto,
    signal?: AbortSignal,
  ) =>
    apiClient.patch<UpdateStockResponseDto>(
      `/inventory/${variantId}/stock`,
      data,
      { signal },
    ),
};

function withQuery(path: string, query: InventoryQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
