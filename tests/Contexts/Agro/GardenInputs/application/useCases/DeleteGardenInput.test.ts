import { DeleteGardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/DeleteGardenInput.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { GardenInputRepositoryMock } from '../../__mocks__/GardenInputRepositoryMock.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

const USER = 'curator';

describe('DeleteGardenInput', () => {
  let repository: GardenInputRepositoryMock;
  let useCase: DeleteGardenInput;

  beforeEach(() => {
    repository = new GardenInputRepositoryMock();
    useCase = new DeleteGardenInput({
      gardenInputRepository: repository
    });
  });

  afterEach(() => repository.clear());

  it('soft-deletes an existing garden input by slug', async () => {
    const input = GardenInputMother.domainBase({ slug: 'jabon-potasico' });
    repository.addToStorage(input);

    await useCase.execute('jabon-potasico', USER, [0]);

    const stored = await repository.findBySlug('jabon-potasico');
    expect(stored?.status).toBe('deleted');
    expect(stored?.isDeleted()).toBe(true);
  });

  it('soft-deletes an existing garden input by UUID', async () => {
    const input = GardenInputMother.domainBase();
    repository.addToStorage(input);

    await useCase.execute(input.idValue, USER, [0]);

    const stored = await repository.findById(input.idValue);
    expect(stored?.status).toBe('deleted');
  });

  it('throws DomainNotFoundException when input does not exist', async () => {
    await expect(
      useCase.execute('inexistente', USER, [0])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws PreconditionFailedException when expected versions do not match', async () => {
    const input = GardenInputMother.domainBase({ slug: 'jabon-potasico' });
    repository.addToStorage(input);

    await expect(
      useCase.execute('jabon-potasico', USER, [99])
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
  });
});
