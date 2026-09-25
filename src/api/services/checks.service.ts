import { apiClient } from "../client";
import type { ChecksListResponseDto, ChecksQuery } from "../types";
export const checksService = { list: (query: ChecksQuery = {}, signal?: AbortSignal) => apiClient.get<ChecksListResponseDto>(withQuery("/checks", query), { signal }) };
function withQuery(path: string, query: ChecksQuery) { const p = new URLSearchParams(); Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); }); return p.size ? `${path}?${p}` : path; }
