import { GetAnomalyBySlug } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/GetAnomalyBySlug.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['collaborator']
};

describe('GetAnomalyBySlug', () => {
  let repository: AnomalyReadRepositoryMock;
  let useCase: GetAnomalyBySlug;

  beforeEach(() => {
    repository = new AnomalyReadRepositoryMock();
    useCase = new GetAnomalyBySlug({ anomalyReadRepository: repository });
  });

  it('returns an active anomaly by slug for an anonymous caller', async () => {
    const view = AnomalyReadViewMother.base();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).resolves.toEqual(view);
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug);
  });

  it('throws not found when the slug does not exist', async () => {
    const slug = random.word({ min: 4, max: 10 });

    await expect(useCase.execute(slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('hides a soft-deleted anomaly from an anonymous caller', async () => {
    const view = AnomalyReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('lets a curator read a soft-deleted anomaly', async () => {
    const view = AnomalyReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, curator)).resolves.toEqual(view);
    repository.assertFindBySlugHasBeenCalledWith(view.slug);
  });

  it('resolves a UUID key by id', async () => {
    const id = random.uuid();
    const view = { ...AnomalyReadViewMother.base(), id };
    repository.addToStorage(view);

    await expect(useCase.execute(id, undefined)).resolves.toEqual(view);
  });
});
