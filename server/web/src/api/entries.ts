import { apiFetch } from './client';
import type { Entry, CreateEntryRequest, UpdateEntryRequest } from '../types';

export const entriesApi = {
  list: () => apiFetch<Entry[]>('/api/admin/entries'),
  get: (id: string) => apiFetch<Entry>(`/api/admin/entries/${id}`),
  create: (data: CreateEntryRequest) => apiFetch<Entry>('/api/admin/entries', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateEntryRequest) => apiFetch<Entry>(`/api/admin/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/api/admin/entries/${id}`, { method: 'DELETE' }),
};
