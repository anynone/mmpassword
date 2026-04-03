import { apiFetch } from './client';
import type { SubscriptionWithUrl, Entry, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '../types';

export const subscriptionsApi = {
  list: () => apiFetch<SubscriptionWithUrl[]>('/api/admin/subscriptions'),
  get: (token: string) => apiFetch<SubscriptionWithUrl>(`/api/admin/subscriptions/${token}`),
  create: (data: CreateSubscriptionRequest) => apiFetch<SubscriptionWithUrl>('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  update: (token: string, data: UpdateSubscriptionRequest) => apiFetch<SubscriptionWithUrl>(`/api/admin/subscriptions/${token}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (token: string) => apiFetch<void>(`/api/admin/subscriptions/${token}`, { method: 'DELETE' }),
  refresh: (token: string) => apiFetch<SubscriptionWithUrl>(`/api/admin/subscriptions/${token}/refresh`, { method: 'POST' }),
  setEntries: (token: string, entryIds: string[]) => apiFetch<void>(`/api/admin/subscriptions/${token}/entries`, { method: 'PUT', body: JSON.stringify({ entryIds }) }),
  getEntries: (token: string) => apiFetch<Entry[]>(`/api/admin/subscriptions/${token}/entries`),
};
