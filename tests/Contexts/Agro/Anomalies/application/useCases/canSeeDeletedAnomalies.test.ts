import { canSeeDeletedAnomalies } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/canSeeDeletedAnomalies.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';

const user = (roles: string[]): UserSessionInfo => ({
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles
});

describe('canSeeDeletedAnomalies', () => {
  it('is true for an admin', () => {
    expect(canSeeDeletedAnomalies(user(['admin']))).toBe(true);
  });

  it('is true for a collaborator', () => {
    expect(canSeeDeletedAnomalies(user(['collaborator']))).toBe(true);
  });

  it('is false for a plain user', () => {
    expect(canSeeDeletedAnomalies(user(['user']))).toBe(false);
  });

  it('is false for an anonymous caller', () => {
    expect(canSeeDeletedAnomalies(undefined)).toBe(false);
  });
});
