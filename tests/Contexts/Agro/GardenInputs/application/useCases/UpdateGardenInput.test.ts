import { UpdateGardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/UpdateGardenInput.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { GardenInputRepositoryMock } from '../../__mocks__/GardenInputRepositoryMock.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

const USER = 'curator';

describe('UpdateGardenInput', () => {
  let repository: GardenInputRepositoryMock;
  let useCase: UpdateGardenInput;

  beforeEach(() => {
    repository = new GardenInputRepositoryMock();
    useCase = new UpdateGardenInput({
      gardenInputRepository: repository
    });
  });

  afterEach(() => repository.clear());

  it('updates an existing garden input by slug', async () => {
    const input = GardenInputMother.domainBase({ slug: 'jabon-potasico' });
    repository.addToStorage(input);

    const updated = await useCase.execute(
      {
        idOrSlug: 'jabon-potasico',
        description: 'Fórmula mejorada'
      },
      USER,
      [0]
    );

    expect(updated.description).toBe('Fórmula mejorada');
    expect(updated.version).toBe(1);
  });

  it('updates an existing garden input by UUID', async () => {
    const input = GardenInputMother.domainBase();
    repository.addToStorage(input);

    const updated = await useCase.execute(
      {
        idOrSlug: input.idValue,
        name: 'Jabón modificado'
      },
      USER,
      [0]
    );

    expect(updated.name).toBe('Jabón modificado');
  });

  it('throws DomainNotFoundException when input does not exist', async () => {
    await expect(
      useCase.execute(
        {
          idOrSlug: 'inexistente',
          name: 'Nombre'
        },
        USER,
        [0]
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws PreconditionFailedException when expected versions do not match', async () => {
    const input = GardenInputMother.domainBase({ slug: 'jabon-potasico' });
    repository.addToStorage(input);

    await expect(
      useCase.execute(
        {
          idOrSlug: 'jabon-potasico',
          name: 'Nombre'
        },
        USER,
        [5]
      )
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
  });
});
