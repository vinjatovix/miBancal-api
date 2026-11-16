import {
  getUserProfileRequest,
  updateUserProfileRequest
} from '../../../../../src/apps/agroApi/controllers/Users/requestSchemas.js';

describe('UserProfile requestSchemas', () => {
  describe('getUserProfileRequest', () => {
    it('accepts empty query and empty body', () => {
      expect(getUserProfileRequest.query.safeParse({}).success).toBe(true);
      expect(getUserProfileRequest.body.safeParse({}).success).toBe(true);
    });
  });

  describe('updateUserProfileRequest', () => {
    const body = updateUserProfileRequest.body;

    it('accepts an empty body object (the only accepted shape)', () => {
      const result = body.safeParse({});

      expect(result.success).toBe(true);
    });

    it('rejects any field, since no geographic or identity field is editable here', () => {
      const result = body.safeParse({ postalCode: '28001' });

      expect(result.success).toBe(false);
    });

    it('rejects unknown properties due to strict mode', () => {
      const result = body.safeParse({ extraField: 'should-fail' });

      expect(result.success).toBe(false);
    });
  });
});
