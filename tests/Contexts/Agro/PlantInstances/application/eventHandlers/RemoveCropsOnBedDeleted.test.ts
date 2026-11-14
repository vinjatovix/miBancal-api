import { BedDeleted } from '../../../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import { RemoveCropsOnBedDeleted } from '../../../../../../src/Contexts/Agro/PlantInstances/application/eventHandlers/RemoveCropsOnBedDeleted.js';
import type { PlantInstanceRepository } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import { random } from '../../../../shared/fixtures/random.js';

describe('RemoveCropsOnBedDeleted', () => {
  const buildMocks = () => {
    const markAllInBedAsRemoved = jest.fn().mockResolvedValue(0);
    const plantInstanceRepository = {
      markAllInBedAsRemoved
    } as unknown as PlantInstanceRepository;

    return { markAllInBedAsRemoved, plantInstanceRepository };
  };

  it('removes every active crop in the deleted bed with the fact payload values', async () => {
    const mocks = buildMocks();
    const occurredAt = '2026-11-14T10:00:00.000Z';
    const event = new BedDeleted({
      bedId: random.uuid(),
      ownerId: random.uuid(),
      deletedBy: 'deleter',
      occurredAt
    });

    await new RemoveCropsOnBedDeleted(mocks).handle(event);

    expect(mocks.markAllInBedAsRemoved).toHaveBeenCalledTimes(1);
    expect(mocks.markAllInBedAsRemoved).toHaveBeenCalledWith(
      event.payload.bedId,
      event.payload.ownerId,
      new Date(occurredAt),
      'deleter'
    );
  });
});
