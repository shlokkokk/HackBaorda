// ═══════════════════════════════════════════════════════════
// API Client — Typed fetch wrapper for the Chronicle backend
// ═══════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RequestConfig {
  method?: string;
  body?: unknown;
  token?: string;
  orgId?: string;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body, token, orgId, headers: extraHeaders } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-Org-Id'] = orgId;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' })) as any;
    throw new ApiError(response.status, error.message ?? 'Request failed', error.details);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

// ─── Typed API Methods ────────────────────────────────

export const api = {
  // Health
  health: () => request<{ status: string; version: string }>('/api/health'),

  // Incidents
  incidents: {
    list: (params?: Record<string, string>, token?: string, orgId?: string) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ incidents: unknown[]; pagination: unknown }>(`/api/incidents${query}`, { token, orgId });
    },
    get: (id: string, token?: string, orgId?: string) =>
      request<{ incident: unknown; interactions: unknown[] }>(`/api/incidents/${id}`, { token, orgId }),
    create: (data: unknown, token?: string, orgId?: string) =>
      request<{ incident: unknown }>('/api/incidents', { method: 'POST', body: data, token, orgId }),
    update: (id: string, data: unknown, token?: string, orgId?: string) =>
      request<{ incident: unknown }>(`/api/incidents/${id}`, { method: 'PATCH', body: data, token, orgId }),
    delete: (id: string, token?: string, orgId?: string) =>
      request<void>(`/api/incidents/${id}`, { method: 'DELETE', token, orgId }),
  },

  // Agent
  agent: {
    query: (data: { incident_id: string; query: string }, token?: string, orgId?: string) =>
      request<{ response: string; tools_used: string[]; memories_retrieved: unknown[] }>(
        '/api/agent/query', { method: 'POST', body: data, token, orgId }
      ),
    interactions: (incidentId: string, token?: string, orgId?: string) =>
      request<{ interactions: unknown[] }>(`/api/agent/interactions/${incidentId}`, { token, orgId }),
    memoryStats: (token?: string, orgId?: string) =>
      request<{ total_memories: number; memories: unknown[] }>('/api/agent/memory/stats', { token, orgId }),
    hosts: (token?: string, orgId?: string) =>
      request<{ hosts: unknown[] }>('/api/agent/hosts', { token, orgId }),
  },

  // Analytics
  analytics: {
    overview: (token?: string, orgId?: string) =>
      request<any>('/api/analytics/overview', { token, orgId }),
    mttrTrend: (token?: string, orgId?: string) =>
      request<{ trend: unknown[] }>('/api/analytics/mttr-trend', { token, orgId }),
    heatmap: (token?: string, orgId?: string) =>
      request<{ heatmap: number[][] }>('/api/analytics/heatmap', { token, orgId }),
  },

  // Ingestion
  ingestion: {
    health: (token?: string, orgId?: string) =>
      request<{ sources: unknown[] }>('/api/ingestion/health', { token, orgId }),
  },

  // Orgs
  orgs: {
    current: (token?: string) =>
      request<{ org: unknown }>('/api/orgs/current', { token }),
    create: (data: { name: string }, token?: string) =>
      request<{ org: unknown }>('/api/orgs', { method: 'POST', body: data, token }),
    update: (id: string, data: unknown, token?: string) =>
      request<{ org: unknown }>(`/api/orgs/${id}`, { method: 'PATCH', body: data, token }),
  },

  // Users
  users: {
    me: (token?: string, orgId?: string) =>
      request<{ user: unknown }>('/api/users/me', { token, orgId }),
    list: (token?: string, orgId?: string) =>
      request<{ users: unknown[] }>('/api/users', { token, orgId }),
    onCall: (token?: string, orgId?: string) =>
      request<{ users: unknown[] }>('/api/users/on-call', { token, orgId }),
    update: (id: string, data: unknown, token?: string, orgId?: string) =>
      request<{ user: unknown }>(`/api/users/${id}`, { method: 'PATCH', body: data, token, orgId }),
  },

  // Runbooks
  runbooks: {
    list: (token?: string, orgId?: string) =>
      request<{ runbooks: unknown[] }>('/api/runbooks', { token, orgId }),
    get: (id: string, token?: string, orgId?: string) =>
      request<{ runbook: unknown }>(`/api/runbooks/${id}`, { token, orgId }),
    create: (data: unknown, token?: string, orgId?: string) =>
      request<{ runbook: unknown }>('/api/runbooks', { method: 'POST', body: data, token, orgId }),
    update: (id: string, data: unknown, token?: string, orgId?: string) =>
      request<{ runbook: unknown }>(`/api/runbooks/${id}`, { method: 'PATCH', body: data, token, orgId }),
    delete: (id: string, token?: string, orgId?: string) =>
      request<void>(`/api/runbooks/${id}`, { method: 'DELETE', token, orgId }),
  },

  // Postmortems
  postmortems: {
    list: (token?: string, orgId?: string) =>
      request<{ postmortems: unknown[] }>('/api/postmortems', { token, orgId }),
    get: (id: string, token?: string, orgId?: string) =>
      request<{ postmortem: unknown }>(`/api/postmortems/${id}`, { token, orgId }),
    update: (id: string, data: unknown, token?: string, orgId?: string) =>
      request<{ postmortem: unknown }>(`/api/postmortems/${id}`, { method: 'PATCH', body: data, token, orgId }),
  },
};
