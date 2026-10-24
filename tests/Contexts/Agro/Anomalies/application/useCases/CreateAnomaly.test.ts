import { CreateAnomaly } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/CreateAnomaly.js';
import { createAnomalyId } from '../../../../../../src/Contexts/Agro/Anomalies/domain/AnomalyId.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyRepositoryMock } from '../../__mocks__/AnomalyRepositoryMock.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';

const USER = 'curator';

describe('CreateAnomaly', () => {
  let repository: AnomalyRepositoryMock;
  let useCase: CreateAnomaly;

  beforeEach(() => {
    repository = new AnomalyRepositoryMock();
    useCase = new CreateAnomaly({ anomalyRepository: repository });
  });

  afterEach(() => repository.clear());

  it('creates and persists an anomaly', async () => {
    const dto = AnomalyScenarios.createDtoBase();

    const anomaly = await useCase.execute(dto, USER);

    expect(anomaly.idValue).toBe(dto.id);
    expect(anomaly.slug).toBe(dto.slug);
    expect(anomaly.category).toBe(dto.category);
    repository.assertExistsCalledWith(dto.id);
    repository.assertSaveHasBeenCalledWith(anomaly);
  });

  it('throws a conflict when the id already exists', async () => {
    const id = random.uuid();
    repository.addToStorage(
      AnomalyScenarios.domainBase({ id: createAnomalyId(id) })
    );
    const dto = AnomalyScenarios.createDtoBase({ id });

    await expect(useCase.execute(dto, USER)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    repository.assertSaveNotCalled();
  });
});
