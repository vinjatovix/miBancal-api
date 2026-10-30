import type { UpdatePlantRelationInput } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/interfaces/UpdatePlantRelationInput.js';
import { UpdatePlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/UpdatePlantRelation.js';
import { TaxonomicScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantRelationRepositoryMock } from '../../__mocks__/PlantRelationRepositoryMock.js';
import { PlantRelationMother } from '../../domain/mothers/PlantRelationMother.js';

describe('UpdatePlantRelation', () => {
  let plantRelationRepository: PlantRelationRepositoryMock;
  let useCase: UpdatePlantRelation;

  beforeEach(() => {
    plantRelationRepository = new PlantRelationRepositoryMock();
    useCase = new UpdatePlantRelation({ plantRelationRepository });
  });

  it('should update successfully and increment version when OCC matches', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing.id,
      mechanism: 'nitrogen_fixer',
      strength: 5,
      reason: 'Updated reason'
    };

    const result = await useCase.execute(updateInput, 'updater', [
      existing.version
    ]);

    expect(result.id).toBe(existing.id);
    expect(result.mechanism).toBe('nitrogen_fixer');
    expect(result.strength).toBe(5);
    expect(result.reason).toBe('Updated reason');
    expect(result.version).toBe(1);
    expect(result.metadata.updatedBy).toBe('updater');

    plantRelationRepository.assertSaveHasBeenCalledWith(result);
  });

  it('should update successfully when expectedVersions contains current version among others', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing.id,
      strength: 5
    };

    const result = await useCase.execute(updateInput, 'updater', [
      999,
      existing.version
    ]);

    expect(result.id).toBe(existing.id);
    expect(result.version).toBe(1);
  });

  it('should throw DomainNotFoundException when relation does not exist', async () => {
    const updateInput: UpdatePlantRelationInput = {
      id: '0192e200-0000-7000-8000-000000000999',
      strength: 5
    };

    await expect(useCase.execute(updateInput, 'updater', [0])).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('should throw DomainStaleVersionException when expectedVersion does not match current version', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing.id,
      strength: 5
    };

    await expect(
      useCase.execute(updateInput, 'updater', [existing.version + 1])
    ).rejects.toThrow(DomainStaleVersionException);
  });

  it('should throw DomainStaleVersionException when expectedVersions list is empty', async () => {
    const existing = PlantRelationMother.create({
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing.id,
      strength: 5
    };

    await expect(useCase.execute(updateInput, 'updater', [])).rejects.toThrow(
      DomainStaleVersionException
    );
  });

  it('should throw DomainConflictException when updating mechanism causes a collision', async () => {
    const existing1 = PlantRelationMother.create({
      mechanism: 'pest_repellent',
      user: 'creator'
    });
    const existing2 = PlantRelationMother.create({
      source: existing1.source,
      target: existing1.target,
      mechanism: 'nitrogen_fixer',
      user: 'creator'
    });
    plantRelationRepository.populate([existing1, existing2]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing1.id,
      mechanism: 'nitrogen_fixer'
    };

    await expect(
      useCase.execute(updateInput, 'updater', [existing1.version])
    ).rejects.toThrow(DomainConflictException);
  });

  it('should handle no-op updates by returning existing entity without incrementing version', async () => {
    const existing = PlantRelationMother.create({
      type: 'beneficial',
      strength: 4,
      user: 'creator'
    });
    plantRelationRepository.populate([existing]);

    const updateInput: UpdatePlantRelationInput = {
      id: existing.id,
      type: 'beneficial',
      strength: 4
    };

    const result = await useCase.execute(updateInput, 'updater', [
      existing.version
    ]);

    expect(result.version).toBe(0);
    expect(result.metadata.updatedBy).toBe('creator');
  });

  it('preserves source and target scopes unchanged when updating scoped relation parameters', async () => {
    const scopedRelation = PlantRelationMother.scoped(
      TaxonomicScope.genus('Tagetes'),
      TaxonomicScope.all(),
      {
        mechanism: 'pest_repellent',
        strength: 3,
        user: 'curator-1'
      }
    );
    plantRelationRepository.populate([scopedRelation]);

    const updateInput: UpdatePlantRelationInput = {
      id: scopedRelation.id,
      strength: 5
    };

    const result = await useCase.execute(updateInput, 'curator-2', [
      scopedRelation.version
    ]);

    expect(result.source.scope).toBe('genus');
    expect(result.source.value).toBe('Tagetes');
    expect(result.target.isAll()).toBe(true);
    expect(result.strength).toBe(5);
    expect(result.version).toBe(1);
    expect(result.metadata.updatedBy).toBe('curator-2');
  });
});
