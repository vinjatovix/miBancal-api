import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import { kafkaDomainEventEnvelopeSchema } from '../../../../../src/Contexts/shared/domain/events/KafkaDomainEventEnvelope.js';

describe('kafkaDomainEventEnvelopeSchema', () => {
  it('accepts a valid domain event envelope with UUIDv7 eventId', () => {
    const validEnvelope = {
      eventId: uuidv7(),
      eventName: 'plant.liked',
      aggregateId: uuidv4(),
      occurredAt: new Date().toISOString(),
      payload: {
        plantId: uuidv4(),
        userId: uuidv4(),
        likedAt: new Date().toISOString()
      }
    };

    const parsed = kafkaDomainEventEnvelopeSchema.parse(validEnvelope);

    expect(parsed).toEqual(validEnvelope);
  });

  it.each([
    ['eventId is not a UUIDv7', () => ({ eventId: uuidv4() })],
    ['aggregateId is not a UUID', () => ({ aggregateId: 'non-uuid' })],
    [
      'occurredAt is not a valid ISO date',
      () => ({ occurredAt: 'not-a-date' })
    ],
    ['eventName is empty', () => ({ eventName: '' })]
  ])('rejects an envelope when %s', (_, mutate) => {
    const invalidEnvelope = {
      eventId: uuidv7(),
      eventName: 'plant.liked',
      aggregateId: uuidv4(),
      occurredAt: new Date().toISOString(),
      payload: {
        plantId: uuidv4()
      },
      ...mutate()
    };

    expect(() =>
      kafkaDomainEventEnvelopeSchema.parse(invalidEnvelope)
    ).toThrow();
  });

  it('accepts an envelope with additional payload attributes', () => {
    const validEnvelope = {
      eventId: uuidv7(),
      eventName: 'plant.unliked',
      aggregateId: uuidv4(),
      occurredAt: new Date().toISOString(),
      payload: {
        plantId: uuidv4(),
        customAttribute: 'extra-info'
      }
    };

    const parsed = kafkaDomainEventEnvelopeSchema.parse(validEnvelope);

    expect(parsed.payload).toHaveProperty('customAttribute', 'extra-info');
  });
});
