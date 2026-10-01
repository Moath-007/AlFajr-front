import { apiClient } from '../client';
import type { CheckUndoDto, IncomingCheckMovementAction, IncomingCheckMovementDto, ManagedCheck, ManagedCheckEditDto, ManagedCheckEditResult, ManagedChecksQuery, ManagedChecksResponse, OutgoingCheckMovementDto } from '../types/ledger';

export const checksService = {
  list: (query: ManagedChecksQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
    return apiClient.get<ManagedChecksResponse>(`/managed-checks${params.size ? `?${params}` : ''}`, { signal });
  },
  details: (id: number, signal?: AbortSignal) => apiClient.get<ManagedCheck>(`/managed-checks/${id}`, { signal }),
  edit: (id: number, input: ManagedCheckEditDto) => apiClient.patch<ManagedCheckEditResult>(`/managed-checks/${id}`, input),
  moveIncoming: (id: number, action: IncomingCheckMovementAction, input: IncomingCheckMovementDto) => apiClient.post<unknown>(`/managed-checks/${id}/movements/${action}`, input),
  undo: (id: number, eventId: number, input: CheckUndoDto) => apiClient.post<unknown>(`/managed-checks/${id}/events/${eventId}/cancel`, input),
  clearOutgoing: (id: number, input: OutgoingCheckMovementDto) => apiClient.post<unknown>(`/managed-checks/${id}/clear-outgoing`, input),
  returnOutgoing: (id: number, input: OutgoingCheckMovementDto) => apiClient.post<unknown>(`/managed-checks/${id}/return-outgoing`, input),
};
