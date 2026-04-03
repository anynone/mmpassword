import { apiFetch } from './client';
import type { Group, CreateGroupRequest, UpdateGroupRequest } from '../types';

export const groupsApi = {
  list: () => apiFetch<Group[]>('/api/admin/groups'),
  create: (data: CreateGroupRequest) => apiFetch<Group>('/api/admin/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateGroupRequest) => apiFetch<Group>(`/api/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/api/admin/groups/${id}`, { method: 'DELETE' }),
};
