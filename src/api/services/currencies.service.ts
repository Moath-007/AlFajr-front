import { apiClient } from "../client";
import type { CurrencyDto } from "../types";
export const currenciesService = {
  list: (signal?: AbortSignal) => apiClient.get<CurrencyDto[] | { items?: CurrencyDto[]; currencies?: CurrencyDto[] }>("/currencies", { signal }),
  create: (data: { code: string; name: string; symbol: string }, signal?: AbortSignal) => apiClient.post<{ message: string; currency: CurrencyDto }>("/currencies", data, { signal }),
};
