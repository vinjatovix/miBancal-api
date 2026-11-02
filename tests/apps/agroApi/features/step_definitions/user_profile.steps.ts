import { Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { tokenFor, type AgroWorld } from './utils/index.js';

Then(
  "the user's JWT token payload must not contain any geographic fields",
  function (this: AgroWorld) {
    const token = tokenFor(this, 'user');
    const parts = token.split('.');
    assert.isAtLeast(parts.length, 2, 'Malformed JWT token');

    const payload = JSON.parse(
      Buffer.from(parts[1] as string, 'base64url').toString('utf8')
    ) as Record<string, unknown>;

    assert.isUndefined(payload.postalCode, 'JWT must not contain postalCode');
    assert.isUndefined(payload.country, 'JWT must not contain country');
    assert.isUndefined(payload.timezone, 'JWT must not contain timezone');
    assert.isUndefined(payload.hemisphere, 'JWT must not contain hemisphere');
  }
);
