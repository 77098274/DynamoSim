// Thin fetch wrapper around the DynamoDB Simulator REST API.
// In dev, Vite proxies /api -> http://localhost:4000 (see vite.config.js).
// In production, set VITE_API_BASE_URL to the deployed backend URL.

const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.statusCode = res.status;
    err.type = data?.__type;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  listTables: () => request('/tables'),
  createTable: (payload) => request('/tables', { method: 'POST', body: JSON.stringify(payload) }),
  getTable: (name) => request(`/tables/${encodeURIComponent(name)}`),
  deleteTable: (name) => request(`/tables/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  advisor: (name) => request(`/tables/${encodeURIComponent(name)}/advisor`),
  stream: (name) => request(`/tables/${encodeURIComponent(name)}/stream`),

  scanItems: (table) => request(`/tables/${encodeURIComponent(table)}/items`),
  putItem: (table, item) =>
    request(`/tables/${encodeURIComponent(table)}/items`, { method: 'POST', body: JSON.stringify(item) }),
  updateItem: (table, pk, sk, patch) =>
    request(
      `/tables/${encodeURIComponent(table)}/items?pk=${encodeURIComponent(pk)}${sk ? `&sk=${encodeURIComponent(sk)}` : ''}`,
      { method: 'PUT', body: JSON.stringify(patch) }
    ),
  deleteItem: (table, pk, sk) =>
    request(
      `/tables/${encodeURIComponent(table)}/items?pk=${encodeURIComponent(pk)}${sk ? `&sk=${encodeURIComponent(sk)}` : ''}`,
      { method: 'DELETE' }
    ),
  queryItems: (table, pk, skCondition) =>
    request(`/tables/${encodeURIComponent(table)}/query`, {
      method: 'POST',
      body: JSON.stringify({ pk, skCondition }),
    }),
};
