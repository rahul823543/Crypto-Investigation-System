export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Base API client for making HTTP requests to the Fastify backend.
 * Used by ApiCaseRepository in live mode.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const hasJsonBody = options.body !== undefined && options.body !== null;

  const response = await fetch(url, {
    ...options,
    headers: {
      // Fastify rejects a request with application/json and no payload. Some
      // endpoints (such as report generation) are intentionally bodyless POSTs.
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
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
    // Preserve valid falsy JSON values too; only omit a body when none was supplied.
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiDownloadBlob(endpoint: string): Promise<Blob> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.message || `Download failed: ${response.status} ${response.statusText}`
    );
  }
  return response.blob();
}

