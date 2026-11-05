import { ListGardenInputs } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/ListGardenInputs.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { GardenInputReadRepositoryMock } from '../../__mocks__/GardenInputReadRepositoryMock.js';
import { GardenInputReadViewMother } from '../queries/GardenInputReadViewMother.js';

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['admin']
};

describe('ListGardenInputs', () => {
  let repository: GardenInputReadRepositoryMock;
  let useCase: ListGardenInputs;

  beforeEach(() => {
    repository = new GardenInputReadRepositoryMock();
    useCase = new ListGardenInputs({ gardenInputReadRepository: repository });
  });

  it('restricts anonymous visitors to active garden inputs', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined);

    repository.assertFindAllHasBeenCalledWith({
      filter: { status: { eq: 'active' } }
    });
  });

  it('does not enforce active status filter for curator', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(curator);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('preserves user filters while enforcing active status for anonymous visitor', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined, {
      query: { filter: { category: { eq: 'fertilizer' } } }
    });

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        category: { eq: 'fertilizer' },
        status: { eq: 'active' }
      }
    });
  });

  it('forwards pagination and sort options while enforcing active status filter', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined, {
      query: {
        pagination: { page: 2, limit: 10 },
        sort: { name: 'asc' }
      }
    });

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 2, limit: 10 },
      sort: { name: 'asc' },
      filter: { status: { eq: 'active' } }
    });
  });
});
