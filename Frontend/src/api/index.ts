import type { DataMode } from '@/types';
import type { CaseRepository } from './repository';
import { MockCaseRepository } from './mockRepository';
import { ApiCaseRepository } from './apiRepository';

export type { CaseRepository } from './repository';

/**
 * Determine data mode from environment variable
 */
export const dataMode: DataMode =
  import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'mock';

/**
 * Factory: creates the appropriate repository based on data mode
 */
export function createCaseRepository(): CaseRepository {
  if (dataMode === 'api') {
    return new ApiCaseRepository();
  }
  return new MockCaseRepository();
}

// Singleton repository instance for the app
export const caseRepository = createCaseRepository();
