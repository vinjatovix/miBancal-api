import type { UserSessionInfo } from '../../../../Auth/application/index.js';

/** Admins and collaborators can read soft-deleted anomalies; everyone else only active ones. */
export const canSeeDeletedAnomalies = (
  user: UserSessionInfo | undefined
): boolean =>
  user?.roles.some((r) => r === 'admin' || r === 'collaborator') ?? false;
