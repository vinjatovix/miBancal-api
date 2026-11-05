import { plantDomainMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { PlantFactory } from '../mothers/PlantFactory.js';

const USER = 'curator';

describe('Plant anomalies', () => {
  it('starts with no anomalies', () => {
    expect(PlantFactory.create().anomalies).toEqual([]);
  });

  it('replaces the list and deduplicates case-insensitively', () => {
    const plant = PlantFactory.create();

    plant.updateAnomalies(['pulgon', 'Pulgon', 'oidio', '  '], USER);

    expect(plant.anomalies).toEqual(['pulgon', 'oidio']);
  });

  it('keeps the stored list when the field is omitted (no updateAnomalies call)', () => {
    const plant = PlantFactory.create();
    plant.updateAnomalies(['pulgon'], USER);

    plant.updateIdentity({ name: { primary: 'Tomate' } }, USER);

    expect(plant.anomalies).toEqual(['pulgon']);
  });

  it('clears the list with null', () => {
    const plant = PlantFactory.create();
    plant.updateAnomalies(['pulgon'], USER);

    plant.updateAnomalies(null, USER);

    expect(plant.anomalies).toEqual([]);
  });

  it('omits an empty list from primitives, carries a non-empty one', () => {
    const plant = PlantFactory.create();
    expect(plantDomainMapper.toPrimitives(plant)).not.toHaveProperty(
      'anomalies'
    );

    plant.updateAnomalies(['pulgon'], USER);

    expect(plantDomainMapper.toPrimitives(plant).anomalies).toEqual(['pulgon']);
  });
});
