import { DataTable, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { rawCollection } from './utils/index.js';

Then(
  'the bed {string} in database should retain geographic attributes:',
  async function (bedId: string, dataTable: DataTable) {
    const expected = dataTable.rowsHash();
    const doc = await rawCollection('beds').findOne({ _id: toMongoId(bedId) });
    assert.isNotNull(doc, `Bed ${bedId} not found in database`);

    if (expected.hemisphere) {
      assert.strictEqual(doc?.hemisphere, expected.hemisphere);
    }
    if (expected.timezone) {
      assert.strictEqual(doc?.timezone, expected.timezone);
    }
    if (expected.country) {
      assert.strictEqual(doc?.country, expected.country);
    }
    if (expected.postalCode) {
      assert.strictEqual(doc?.postalCode, expected.postalCode);
    }
  }
);
