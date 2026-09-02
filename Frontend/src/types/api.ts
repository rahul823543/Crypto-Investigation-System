// ─── API Types ──────────────────────────────────────────────────────────────

export type DataMode = 'mock' | 'api';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
