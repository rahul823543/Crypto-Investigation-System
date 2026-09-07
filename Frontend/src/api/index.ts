import type { CaseRepository } from './repository';
import { MockCaseRepository } from './mockRepository';
import { ApiCaseRepository } from './apiRepository';

export type { CaseRepository } from './repository';

/**
 * Named singletons — both are always instantiated at boot.
 * Hooks choose which one to use based on the case's mode field.
 */
export const mockRepository: CaseRepository = new MockCaseRepository();
export const apiRepository: CaseRepository = new ApiCaseRepository();

/**
 * Returns the correct repository for a given mode string.
 * 'live' or 'api' → ApiCaseRepository (calls Fastify)
 * 'demo' or 'mock' (or anything else) → MockCaseRepository
 */
export function getRepository(mode: string): CaseRepository {
  return mode === 'live' || mode === 'api' ? apiRepository : mockRepository;
}

/**
 * Default singleton — used by hooks that don't have per-case mode context.
 * Defaults to mock (seeded) mode; override with VITE_DATA_MODE=api env var.
 */
export const caseRepository: CaseRepository =
  import.meta.env.VITE_DATA_MODE === 'api' ? apiRepository : mockRepository;
