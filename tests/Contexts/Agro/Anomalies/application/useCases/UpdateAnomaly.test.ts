import { UpdateAnomaly } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/UpdateAnomaly.js';
import {
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyRepositoryMock } from '../../__mocks__/AnomalyRepositoryMock.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const USER = 'curator';

describe('UpdateAnomaly', () => {
  let repository: AnomalyRepositoryMock;
  let readRepository: AnomalyReadRepositoryMock;
  let useCase: UpdateAnomaly;

  beforeEach(() => {
    repository = new AnomalyRepositoryMock();
    readRepository = new AnomalyReadRepositoryMock();
    useCase = new UpdateAnomaly({
      anomalyRepository: repository,
      anomalyReadRepository: readRepository
    });
  });

  afterEach(() => repository.clear());

  it('applies a merge-patch by slug and persists the diff', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);

    const updated = await useCase.execute(
      { idOrSlug: anomaly.slug, name: 'Áfido', description: null },
      USER,
      [0]
    );

    expect(updated.name).toBe('Áfido');
    expect(updated.description).toBeUndefined();
    repository.assertUpdateCalled();
  });

  it('throws when the expected version does not match', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);

    await expect(
      useCase.execute({ idOrSlug: anomaly.slug, name: 'x' }, USER, [99])
    ).rejects.toThrow();
    repository.assertUpdateNotCalled();
  });

  it('throws not found for an unknown slug', async () => {
    await expect(
      useCase.execute({ idOrSlug: random.word({ min: 4, max: 10 }) }, USER, [0])
    ).rejects.toThrow();
  });

  it('throws not found when the anomaly addressed by slug is soft-deleted', async () => {
    const anomaly = AnomalyScenarios.domainDeleted();
    repository.addToStorage(anomaly);

    await expect(
      useCase.execute({ idOrSlug: anomaly.slug, name: 'x' }, USER, [
        anomaly.version
      ])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('stores confusedWith when every slug exists', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('mildiu'));

    const updated = await useCase.execute(
      { idOrSlug: anomaly.slug, confusedWith: ['mildiu'] },
      USER,
      [0]
    );

    expect(updated.confusedWith).toStrictEqual(['mildiu']);
    repository.assertUpdateCalled();
  });

  it('rejects an update whose confusedWith names an unknown slug', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);

    await expect(
      useCase.execute(
        { idOrSlug: anomaly.slug, confusedWith: ['ghost'] },
        USER,
        [0]
      )
    ).rejects.toBeInstanceOf(InvalidArgumentException);
    repository.assertUpdateNotCalled();
  });
});
