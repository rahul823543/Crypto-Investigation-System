import type { CaseRepository } from './repository';
import { ApiCaseRepository } from './apiRepository';

export type { CaseRepository } from './repository';

/**
 * Named singletons — ApiCaseRepository connects to live Fastify backend.
 */
export const apiRepository: CaseRepository = new ApiCaseRepository();
export const mockRepository: CaseRepository = apiRepository;

/**
 * Returns the repository for a given mode string (delegates to apiRepository).
 */
export function getRepository(_mode?: string): CaseRepository {
  return apiRepository;
}

/**
 * Default singleton — uses live Fastify backend.
 */
export const caseRepository: CaseRepository = apiRepository;

