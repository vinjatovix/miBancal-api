import { ListAnomalies } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/ListAnomalies.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['admin']
};

describe('ListAnomalies', () => {
  let repository: AnomalyReadRepositoryMock;
  let useCase: ListAnomalies;

  beforeEach(() => {
    repository = new AnomalyReadRepositoryMock();
    useCase = new ListAnomalies({ anomalyReadRepository: repository });
  });

  it('restricts anonymous callers to ACTIVE anomalies', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(undefined);

    repository.assertFindAllHasBeenCalledWith({
      filter: { status: { eq: AnomalyStatus.ACTIVE } }
    });
  });

  it('does not force a status filter for a curator', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(curator);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });
});
