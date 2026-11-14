import { BedDeleted } from '../../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import { PlantLiked } from '../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import { random } from '../../../shared/fixtures/random.js';

describe('DomainEvent.toPrimitives', () => {
  it('returns the self-contained event with occurredAt as an ISO 8601 string', () => {
    const bedId = random.uuid();
    const event = new BedDeleted({
      bedId,
      ownerId: random.uuid(),
      deletedBy: 'gardener',
      occurredAt: new Date().toISOString()
    });

    const primitives = event.toPrimitives();

    expect(primitives).toEqual({
      eventId: event.eventId,
      eventName: 'bed.deleted',
      aggregateId: bedId,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload
    });
    expect(new Date(primitives.occurredAt).toISOString()).toBe(
      primitives.occurredAt
    );
  });

  it('mirrors the aggregateId and eventName of the event for any producer', () => {
    const plantId = random.uuid();
    const event = new PlantLiked(plantId, {
      plantId,
      userId: random.uuid(),
      likedAt: new Date().toISOString()
    });

    const primitives = event.toPrimitives();

    expect(primitives.eventId).toBe(event.eventId);
    expect(primitives.eventName).toBe('plant.liked');
    expect(primitives.aggregateId).toBe(plantId);
    expect(primitives.payload).toEqual(event.payload);
  });
});
