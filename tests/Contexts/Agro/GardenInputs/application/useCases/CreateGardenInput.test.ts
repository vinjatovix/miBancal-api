import { CreateGardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/CreateGardenInput.js';
import { createGardenInputId } from '../../../../../../src/Contexts/Agro/GardenInputs/domain/GardenInputId.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { GardenInputRepositoryMock } from '../../__mocks__/GardenInputRepositoryMock.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

const USER = 'curator';

describe('CreateGardenInput', () => {
  let repository: GardenInputRepositoryMock;
  let useCase: CreateGardenInput;

  beforeEach(() => {
    repository = new GardenInputRepositoryMock();
    useCase = new CreateGardenInput({
      gardenInputRepository: repository
    });
  });

  afterEach(() => repository.clear());

  it('creates and persists a garden input', async () => {
    const primitives = GardenInputMother.primitivesBase();
    const dto = {
      id: primitives.id,
      slug: primitives.slug,
      name: primitives.name,
      category: primitives.category,
      ...(primitives.actions && { actions: primitives.actions }),
      ...(primitives.recipes && { recipes: primitives.recipes })
    };

    const input = await useCase.execute(dto, USER);

    expect(input.idValue).toBe(dto.id);
    expect(input.slug).toBe(dto.slug);
    expect(input.category).toBe(dto.category);
    repository.assertExistsCalledWith(dto.id);
    repository.assertSaveHasBeenCalledWith(input);
  });

  it('throws a conflict when the id already exists', async () => {
    const id = random.uuid();
    repository.addToStorage(
      GardenInputMother.domainBase({ id: createGardenInputId(id) })
    );
    const dto = {
      id,
      slug: 'nuevo-slug',
      name: 'Nuevo input',
      category: 'defense' as const
    };

    await expect(useCase.execute(dto, USER)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    repository.assertSaveNotCalled();
  });

  it('throws a conflict when the slug already exists', async () => {
    repository.addToStorage(
      GardenInputMother.domainBase({ slug: 'jabon-potasico' })
    );
    const dto = {
      id: random.uuid(),
      slug: 'jabon-potasico',
      name: 'Jabón duplicado',
      category: 'defense' as const
    };

    await expect(useCase.execute(dto, USER)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    repository.assertSaveNotCalled();
  });

  it('rejects an invalid slug format', async () => {
    const dto = {
      id: random.uuid(),
      slug: 'Invalid Slug!',
      name: 'Inválido',
      category: 'defense' as const
    };

    await expect(useCase.execute(dto, USER)).rejects.toBeInstanceOf(
      InvalidArgumentException
    );
  });
});
