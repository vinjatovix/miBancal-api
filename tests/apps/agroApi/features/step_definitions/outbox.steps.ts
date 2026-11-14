import { Before, Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import { type Collection, MongoServerError } from 'mongodb';

import { suite, type AgroWorld } from './utils/index.js';

type OutboxDocument = {
  _id: string;
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: {
    eventId: string;
    eventName: string;
    aggregateId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  };
  createdAt: Date;
  processedAt?: Date;
};

const REQUIRED_KEYS = [
  '_id',
  'aggregateId',
  'createdAt',
  'eventName',
  'occurredAt',
  'payload'
];

const outbox = (): Collection<OutboxDocument> =>
  suite().client.db().collection<OutboxDocument>('outbox');

// The outbox collection is created by migration in deployed environments; the
// acceptance arranger only empties collections, so ensure it exists once here.
Before(async () => {
  try {
    await suite().client.db().createCollection('outbox');
  } catch (error) {
    if (
      !(error instanceof MongoServerError) ||
      error.codeName !== 'NamespaceExists'
    ) {
      throw error;
    }
  }
});

Then('no outbox records should be staged', async function () {
  assert.strictEqual(await outbox().countDocuments(), 0);
});

Then(
  'exactly {int} outbox records should be staged',
  async function (expected: number) {
    assert.strictEqual(await outbox().countDocuments(), expected);
  }
);

Then(
  'a complete {string} outbox record should be staged for the bed',
  async function (this: AgroWorld, eventName: string) {
    const bedId = this.bedId;
    assert.exists(bedId, 'bedId not set');

    const docs = await outbox()
      .find({ eventName, aggregateId: bedId })
      .toArray();
    assert.lengthOf(docs, 1, `expected exactly one ${eventName} record`);

    const [doc] = docs as [OutboxDocument];
    assert.deepEqual(Object.keys(doc).sort(), REQUIRED_KEYS);
    assert.isFalse(
      Object.prototype.hasOwnProperty.call(doc, 'processedAt'),
      'processedAt must be absent, never null'
    );
    assert.strictEqual(doc._id, doc.payload.eventId);
    assert.strictEqual(doc.eventName, doc.payload.eventName);
    assert.strictEqual(doc.aggregateId, doc.payload.aggregateId);
    assert.instanceOf(doc.occurredAt, Date);
    assert.instanceOf(doc.createdAt, Date);
  }
);

Then(
  'the outbox eventNames in _id order should be {string}',
  async function (expected: string) {
    const expectedNames = expected.split(',').map((name) => name.trim());
    const names = (await outbox().find().sort({ _id: 1 }).toArray()).map(
      (doc) => doc.eventName
    );

    assert.deepEqual(names, expectedNames);
  }
);
