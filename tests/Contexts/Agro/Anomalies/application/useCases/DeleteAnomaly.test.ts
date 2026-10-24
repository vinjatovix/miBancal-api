import { DeleteAnomaly } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/DeleteAnomaly.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyRepositoryMock } from '../../__mocks__/AnomalyRepositoryMock.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';

const USER = 'curator';

describe('DeleteAnomaly', () => {
  let repository: AnomalyRepositoryMock;
  let useCase: DeleteAnomaly;

  beforeEach(() => {
    repository = new AnomalyRepositoryMock();
    useCase = new DeleteAnomaly({ anomalyRepository: repository });
  });

  afterEach(() => repository.clear());

  it('soft-deletes an active anomaly by slug', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);

    await useCase.execute(anomaly.slug, USER, [0]);

    repository.assertUpdateCalled();
    const [, deleted] = repository.getLastUpdateArgs();
    expect(deleted.status).toBe(AnomalyStatus.DELETED);
    expect(deleted.deletedAt).toBeDefined();
  });

  it('throws not found for an unknown slug', async () => {
    await expect(
      useCase.execute(random.word({ min: 4, max: 10 }), USER, [0])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws when the expected version does not match', async () => {
    const anomaly = AnomalyScenarios.domainBase();
    repository.addToStorage(anomaly);

    await expect(useCase.execute(anomaly.slug, USER, [99])).rejects.toThrow();
    repository.assertUpdateNotCalled();
  });

  it('throws not found when the anomaly addressed by slug is soft-deleted', async () => {
    const anomaly = AnomalyScenarios.domainDeleted();
    repository.addToStorage(anomaly);

    await expect(
      useCase.execute(anomaly.slug, USER, [anomaly.version])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });
});
