import { ListUserLocations } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/ListUserLocations.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';

describe('ListUserLocations', () => {
  let repository: LocationRepositoryMock;
  let useCase: ListUserLocations;

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    useCase = new ListUserLocations({ locationRepository: repository });
  });

  it('forces the owner filter to the given userId, overriding any client filter', async () => {
    const userId = random.uuid();

    await useCase.execute(userId, {
      pagination: { page: 1, limit: 10 }
    });

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 1, limit: 10 },
      filter: { userId: { eq: userId } }
    });
  });

  it('passes sort through untouched', async () => {
    const userId = random.uuid();

    await useCase.execute(userId, {
      sort: { name: 'asc' },
      pagination: { page: 1, limit: 10 }
    });

    repository.assertFindAllHasBeenCalledWith({
      sort: { name: 'asc' },
      pagination: { page: 1, limit: 10 },
      filter: { userId: { eq: userId } }
    });
  });
});
