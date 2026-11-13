import type { UserSessionInfo } from '../../../../Auth/application/index.js';

export const canSeeDeletedGardenInputs = (
  user: UserSessionInfo | undefined
): boolean =>
  user?.roles.some((r) => r === 'admin' || r === 'collaborator') ?? false;
