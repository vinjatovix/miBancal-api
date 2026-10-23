import { plantDomainMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { plantPersistenceMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { toPlantResponse } from '../../../../../src/Contexts/Agro/Plants/mappers/plantResponseMapper.js';
import { PlantFactory } from '../domain/mothers/PlantFactory.js';
import { PlantKnowledgeBuilder } from '../domain/mothers/PlantKnowledgeBuilder.js';
import { PlantResourceBuilder } from '../domain/mothers/PlantResourceBuilder.js';

describe('toPlantResponse', () => {
  it('sends the first image resource as image', () => {
    const image = PlantResourceBuilder.image();
    const plant = PlantFactory.tomato({
      knowledge: PlantKnowledgeBuilder.withResources([
        PlantResourceBuilder.video(),
        image,
        PlantResourceBuilder.image()
      ])
    });

    expect(toPlantResponse(plant).image).toStrictEqual({
      url: image.url,
      title: image.title,
      source: image.source
    });
  });

  it('leaves the plant primitives without image', () => {
    const plant = PlantFactory.tomato({
      knowledge: PlantKnowledgeBuilder.withResources([
        PlantResourceBuilder.image()
      ])
    });

    expect(plantDomainMapper.toPrimitives(plant)).not.toHaveProperty('image');
  });

  it('defaults likesCount to 0 for a plant with no stored likes', () => {
    expect(toPlantResponse(PlantFactory.tomato()).likesCount).toBe(0);
  });

  it('surfaces the hydrated likesCount projection', () => {
    const document = {
      ...plantPersistenceMapper.toMongoDocument(PlantFactory.tomato()),
      likesCount: 7
    };
    const plant = plantPersistenceMapper.fromMongoDocument(document);

    expect(toPlantResponse(plant).likesCount).toBe(7);
  });

  it('never serializes likesCount back to the write path', () => {
    const document = plantPersistenceMapper.toMongoDocument(
      PlantFactory.tomato()
    );

    expect(document).not.toHaveProperty('likesCount');
  });
});
