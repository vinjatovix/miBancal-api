import { DeletePlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/DeletePlantRelation.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantRelationRepositoryMock } from '../../__mocks__/PlantRelationRepositoryMock.js';
import { PlantRelationMother } from '../../domain/mothers/PlantRelationMother.js';

describe('DeletePlantRelation', () => {
  let plantRelationRepository: PlantRelationRepositoryMock;
  let useCase: DeletePlantRelation;

  beforeEach(() => {
    plantRelationRepository = new PlantRelationRepositoryMock();
    useCase = new DeletePlantRelation({ plantRelationRepository });
  });

  it('should successfully delete relation when OCC matches', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    await useCase.execute(existing.id, [existing.version]);

    plantRelationRepository.assertDeleteHasBeenCalledWith(
      existing.id,
      existing.version
    );
  });

  it('should successfully delete relation when expectedVersions contains current version among others', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    await useCase.execute(existing.id, [999, existing.version]);

    plantRelationRepository.assertDeleteHasBeenCalledWith(
      existing.id,
      existing.version
    );
  });

  it('should throw DomainNotFoundException when relation does not exist', async () => {
    await expect(
      useCase.execute('0192e200-0000-7000-8000-000000000999', [0])
    ).rejects.toThrow(DomainNotFoundException);
  });

  it('should throw DomainStaleVersionException when expectedVersion does not match current version', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    await expect(
      useCase.execute(existing.id, [existing.version + 1])
    ).rejects.toThrow(DomainStaleVersionException);
  });

  it('should throw DomainStaleVersionException when expectedVersions list is empty', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    await expect(useCase.execute(existing.id, [])).rejects.toThrow(
      DomainStaleVersionException
    );
  });
});
