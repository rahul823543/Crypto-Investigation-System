const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Base API client for making HTTP requests to the Fastify backend.
 * Used by ApiCaseRepository in live mode.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.message || `API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}
