import { GetGardenInputByIdOrSlug } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/GetGardenInputByIdOrSlug.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { GardenInputReadRepositoryMock } from '../../__mocks__/GardenInputReadRepositoryMock.js';
import { GardenInputReadViewMother } from '../queries/GardenInputReadViewMother.js';

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['collaborator']
};

describe('GetGardenInputByIdOrSlug', () => {
  let repository: GardenInputReadRepositoryMock;
  let useCase: GetGardenInputByIdOrSlug;

  beforeEach(() => {
    repository = new GardenInputReadRepositoryMock();
    useCase = new GetGardenInputByIdOrSlug({
      gardenInputReadRepository: repository
    });
  });

  it('returns active garden input by slug for anonymous visitor', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, undefined);

    expect(result).toEqual(view);
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug);
  });

  it('throws DomainNotFoundException when slug does not exist', async () => {
    const nonexistentSlug = random.word({ min: 4, max: 10 });

    await expect(
      useCase.execute(nonexistentSlug, undefined)
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('hides soft-deleted garden input from anonymous visitor', async () => {
    const view = GardenInputReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('allows curator to read soft-deleted garden input', async () => {
    const view = GardenInputReadViewMother.deleted();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, curator);

    expect(result).toEqual(view);
    repository.assertFindBySlugHasBeenCalledWith(view.slug);
  });

  it('forwards sparse fieldset options to read repository', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, undefined, {
      fields: ['id', 'slug', 'name']
    });

    expect(result).toEqual({
      id: view.id,
      slug: view.slug,
      name: view.name
    });
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug, {
      fields: ['id', 'slug', 'name']
    });
  });

  it('resolves garden input by UUID', async () => {
    const id = random.uuid();
    const view = { ...GardenInputReadViewMother.base(), id };
    repository.addToStorage(view);

    const result = await useCase.execute(id, undefined);

    expect(result).toEqual(view);
  });
});
