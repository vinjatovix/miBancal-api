import { CreateAnomaly } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/CreateAnomaly.js';
import { createAnomalyId } from '../../../../../../src/Contexts/Agro/Anomalies/domain/AnomalyId.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyRepositoryMock } from '../../__mocks__/AnomalyRepositoryMock.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const USER = 'curator';

describe('CreateAnomaly', () => {
  let repository: AnomalyRepositoryMock;
  let readRepository: AnomalyReadRepositoryMock;
  let useCase: CreateAnomaly;

  beforeEach(() => {
    repository = new AnomalyRepositoryMock();
    readRepository = new AnomalyReadRepositoryMock();
    useCase = new CreateAnomaly({
      anomalyRepository: repository,
      anomalyReadRepository: readRepository
    });
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

  it('persists an anomaly whose confusedWith slugs all exist', async () => {
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('mildiu'));
    const dto = AnomalyScenarios.createDtoBase({ confusedWith: ['mildiu'] });

    const anomaly = await useCase.execute(dto, USER);

    expect(anomaly.confusedWith).toStrictEqual(['mildiu']);
    repository.assertSaveHasBeenCalledWith(anomaly);
  });

  it('rejects a create whose confusedWith names an unknown slug', async () => {
    const dto = AnomalyScenarios.createDtoBase({ confusedWith: ['ghost'] });

    await expect(useCase.execute(dto, USER)).rejects.toBeInstanceOf(
      InvalidArgumentException
    );
    repository.assertSaveNotCalled();
  });
});
