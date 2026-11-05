import { gardenInputInputMapper } from '../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputInputMapper.js';
import { GardenInputMother } from '../domain/mothers/GardenInputMother.js';

const USER = 'curator';

describe('gardenInputInputMapper', () => {
  it('builds an active aggregate from a create DTO', () => {
    const primitives = GardenInputMother.primitivesBase();
    const dto = {
      id: primitives.id,
      slug: primitives.slug,
      name: primitives.name,
      category: primitives.category,
      ...(primitives.actions && { actions: primitives.actions }),
      ...(primitives.recipes && { recipes: primitives.recipes })
    };

    const input = gardenInputInputMapper.fromCreateDto(dto, USER);

    expect(input.idValue).toBe(dto.id);
    expect(input.slug).toBe(dto.slug);
    expect(input.category).toBe(dto.category);
    expect(input.metadata.toPrimitives().createdBy).toBe(USER);
    expect(input.version).toBe(0);
  });

  it('maps only defined changes, keeping null as a clear', () => {
    const changes = gardenInputInputMapper.toChanges({
      name: 'Jabón nuevo',
      description: null,
      actions: ['insecticide']
    });

    expect(changes).toEqual({
      name: 'Jabón nuevo',
      description: null,
      actions: ['insecticide']
    });
    expect(changes).not.toHaveProperty('id');
  });

  it('omits undefined fields from changes object', () => {
    const inputWithUndefined: Record<string, unknown> = {
      name: 'Jabón nuevo',
      description: undefined,
      category: undefined
    };
    const changes = gardenInputInputMapper.toChanges(inputWithUndefined);

    expect(changes).toEqual({
      name: 'Jabón nuevo'
    });
    expect(changes).not.toHaveProperty('description');
    expect(changes).not.toHaveProperty('category');
  });
});
