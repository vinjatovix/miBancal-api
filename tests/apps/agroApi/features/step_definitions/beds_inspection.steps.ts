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

    if (expected.latitude !== undefined) {
      assert.strictEqual(doc?.latitude, Number(expected.latitude));
    }
    if (expected.longitude !== undefined) {
      assert.strictEqual(doc?.longitude, Number(expected.longitude));
    }
  }
);
