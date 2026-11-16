import { DeleteGardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/DeleteGardenInput.js';
import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey
} from '../../../../../../src/Contexts/shared/application/cache/index.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { GardenInputRepositoryMock } from '../../__mocks__/GardenInputRepositoryMock.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

const USER = 'curator';

describe('DeleteGardenInput', () => {
  let repository: GardenInputRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: DeleteGardenInput;

  beforeEach(() => {
    repository = new GardenInputRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new DeleteGardenInput({
      gardenInputRepository: repository,
      cacheRepository: cache
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

  it('invalidates the entry and bumps the generation after a soft delete', async () => {
    const input = GardenInputMother.domainBase({ slug: 'jabon-potasico' });
    repository.addToStorage(input);

    await useCase.execute('jabon-potasico', USER, [0]);

    expect(cache.deleteMock).toHaveBeenCalledWith(
      catalogIdKey('gardenInputs', input.idValue)
    );
    expect(cache.deleteMock).toHaveBeenCalledWith(
      catalogSlugKey('gardenInputs', input.slug)
    );
    expect(cache.bumpGenerationMock).toHaveBeenCalledWith(
      catalogNamespace('gardenInputs')
    );
  });

  it('does not touch the cache when delete fails', async () => {
    await expect(
      useCase.execute('non-existent', USER, [0])
    ).rejects.toBeInstanceOf(DomainNotFoundException);

    expect(cache.deleteMock).not.toHaveBeenCalled();
    expect(cache.bumpGenerationMock).not.toHaveBeenCalled();
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
