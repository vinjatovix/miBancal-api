import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { assert } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { PlantRelation } from '../../../../../src/Contexts/Agro/PlantRelations/domain/entities/PlantRelation.js';
import type { PlantRelationMechanism } from '../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationType.js';
import { CompanionEvaluationService } from '../../../../../src/Contexts/Agro/PlantRelations/domain/services/CompanionEvaluationService.js';
import type {
  CompanionEvaluationResult,
  CropPlacement
} from '../../../../../src/Contexts/Agro/PlantRelations/domain/services/types/CompanionEvaluationTypes.js';
import { ProximityDistance } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import type { AgroWorld } from './utils/index.js';

type PlantContext = {
  id: string;
  scientificName: string;
  familyId?: string;
};

type HierarchicalResolutionContext = {
  plants: Map<string, PlantContext>;
  families: Map<string, string>;
  candidateRules: PlantRelation[];
  evaluationResult?: CompanionEvaluationResult;
};

const getContext = (world: AgroWorld): HierarchicalResolutionContext => {
  const dynamicWorld = world as unknown as {
    __hierarchicalContext?: HierarchicalResolutionContext;
  };
  if (!dynamicWorld.__hierarchicalContext) {
    dynamicWorld.__hierarchicalContext = {
      plants: new Map(),
      families: new Map(),
      candidateRules: []
    };
  }
  return dynamicWorld.__hierarchicalContext;
};

const service = new CompanionEvaluationService();

Given(
  'a catalog plant {string} with scientific name {string}',
  function (this: AgroWorld, plantName: string, scientificName: string) {
    const ctx = getContext(this);
    ctx.plants.set(plantName, {
      id: uuidv4(),
      scientificName
    });
  }
);

Given(
  'a catalog plant {string} with scientific name {string} in family {string}',
  function (
    this: AgroWorld,
    plantName: string,
    scientificName: string,
    familyName: string
  ) {
    const ctx = getContext(this);
    const familyId = ctx.families.get(familyName) ?? uuidv4();
    ctx.families.set(familyName, familyId);
    ctx.plants.set(plantName, {
      id: uuidv4(),
      scientificName,
      familyId
    });
  }
);

Given(
  'a catalog family {string}',
  function (this: AgroWorld, familyName: string) {
    const ctx = getContext(this);
    if (!ctx.families.has(familyName)) {
      ctx.families.set(familyName, uuidv4());
    }
  }
);

Given(
  'a scoped relation from genus {string} to genus {string} with mechanism {string}',
  function (
    this: AgroWorld,
    sourceGenus: string,
    targetGenus: string,
    mechanism: string
  ) {
    const ctx = getContext(this);
    const rule = PlantRelation.create({
      source: TaxonomicScope.genus(sourceGenus),
      target: TaxonomicScope.genus(targetGenus),
      type: 'beneficial',
      mechanism: mechanism as PlantRelationMechanism,
      strength: 4,
      proximity: ProximityDistance.create(0, 100),
      reason: `${sourceGenus} protects ${targetGenus}`,
      user: 'curator-1'
    });
    ctx.candidateRules.push(rule);
  }
);

Given(
  'a broadcast relation from genus {string} targeting all with mechanism {string}',
  function (this: AgroWorld, sourceGenus: string, mechanism: string) {
    const ctx = getContext(this);
    const rule = PlantRelation.create({
      source: TaxonomicScope.genus(sourceGenus),
      target: TaxonomicScope.all(),
      type: 'beneficial',
      mechanism: mechanism as PlantRelationMechanism,
      strength: 4,
      proximity: ProximityDistance.create(0, 100),
      reason: `${sourceGenus} broadcast ${mechanism}`,
      user: 'curator-1'
    });
    ctx.candidateRules.push(rule);
  }
);

Given(
  'a scoped relation from family {string} to family {string} with mechanism {string} and type {string}',
  function (
    this: AgroWorld,
    sourceFamilyName: string,
    targetFamilyName: string,
    mechanism: string,
    type: string
  ) {
    const ctx = getContext(this);
    const sourceFamilyId = ctx.families.get(sourceFamilyName) ?? uuidv4();
    const targetFamilyId = ctx.families.get(targetFamilyName) ?? uuidv4();
    ctx.families.set(sourceFamilyName, sourceFamilyId);
    ctx.families.set(targetFamilyName, targetFamilyId);

    const rule = PlantRelation.create({
      source: TaxonomicScope.family(sourceFamilyId),
      target: TaxonomicScope.family(targetFamilyId),
      type: type as PlantRelationType,
      mechanism: mechanism as PlantRelationMechanism,
      strength: 3,
      proximity: ProximityDistance.create(0, 100),
      reason: `${sourceFamilyName} to ${targetFamilyName}`,
      user: 'curator-1'
    });
    ctx.candidateRules.push(rule);
  }
);

Given(
  'a scoped relation from plant {string} to plant {string} with mechanism {string} and type {string}',
  function (
    this: AgroWorld,
    sourcePlantName: string,
    targetPlantName: string,
    mechanism: string,
    type: string
  ) {
    const ctx = getContext(this);
    const sourcePlant = ctx.plants.get(sourcePlantName);
    const targetPlant = ctx.plants.get(targetPlantName);
    assert.exists(sourcePlant, `Plant "${sourcePlantName}" not registered`);
    assert.exists(targetPlant, `Plant "${targetPlantName}" not registered`);

    const rule = PlantRelation.create({
      source: TaxonomicScope.plant(sourcePlant.id),
      target: TaxonomicScope.plant(targetPlant.id),
      type: type as PlantRelationType,
      mechanism: mechanism as PlantRelationMechanism,
      strength: 5,
      proximity: ProximityDistance.create(0, 100),
      reason: `${sourcePlantName} to ${targetPlantName}`,
      user: 'curator-1'
    });
    ctx.candidateRules.push(rule);
  }
);

Given(
  'a scoped relation from plant {string} to plant {string} with mechanism {string} within max distance {int} cm',
  function (
    this: AgroWorld,
    sourcePlantName: string,
    targetPlantName: string,
    mechanism: string,
    maxDistanceCm: number
  ) {
    const ctx = getContext(this);
    const sourcePlant = ctx.plants.get(sourcePlantName);
    const targetPlant = ctx.plants.get(targetPlantName);
    assert.exists(sourcePlant, `Plant "${sourcePlantName}" not registered`);
    assert.exists(targetPlant, `Plant "${targetPlantName}" not registered`);

    const rule = PlantRelation.create({
      source: TaxonomicScope.plant(sourcePlant.id),
      target: TaxonomicScope.plant(targetPlant.id),
      type: 'beneficial',
      mechanism: mechanism as PlantRelationMechanism,
      strength: 4,
      proximity: ProximityDistance.create(0, maxDistanceCm),
      reason: `${sourcePlantName} to ${targetPlantName} within ${maxDistanceCm}cm`,
      user: 'curator-1'
    });
    ctx.candidateRules.push(rule);
  }
);

When(
  'I evaluate companions for {string} at \\({int}, {int}\\) and {string} at \\({int}, {int}\\)',
  function (
    this: AgroWorld,
    cropAName: string,
    x1: number,
    y1: number,
    cropBName: string,
    x2: number,
    y2: number
  ) {
    const ctx = getContext(this);
    const plantA = ctx.plants.get(cropAName);
    const plantB = ctx.plants.get(cropBName);
    assert.exists(plantA, `Plant "${cropAName}" not registered`);
    assert.exists(plantB, `Plant "${cropBName}" not registered`);

    const cropA: CropPlacement = {
      id: `crop-${cropAName}`,
      plantId: plantA.id,
      scientificName: plantA.scientificName,
      ...(plantA.familyId ? { familyId: plantA.familyId } : {}),
      position: { x: x1, y: y1 }
    };

    const cropB: CropPlacement = {
      id: `crop-${cropBName}`,
      plantId: plantB.id,
      scientificName: plantB.scientificName,
      ...(plantB.familyId ? { familyId: plantB.familyId } : {}),
      position: { x: x2, y: y2 }
    };

    ctx.evaluationResult = service.evaluatePair(
      cropA,
      cropB,
      ctx.candidateRules
    );
  }
);

Then(
  'an active companion interaction is resolved with:',
  function (this: AgroWorld, table: DataTable) {
    const ctx = getContext(this);
    assert.exists(ctx.evaluationResult, 'Evaluation result does not exist');
    const active = ctx.evaluationResult.activeRelations;
    assert.isAbove(active.length, 0, 'Expected at least one active relation');

    const expectedRow = table.hashes()[0];
    assert.exists(expectedRow, 'Expected data table row');
    if (!expectedRow) {
      return;
    }

    const match = active.find((rel) => {
      let matches = true;
      if (expectedRow.mechanism && rel.mechanism !== expectedRow.mechanism) {
        matches = false;
      }
      if (expectedRow.tier && rel.tier !== expectedRow.tier) {
        matches = false;
      }
      if (
        expectedRow.specificityScore &&
        rel.specificityScore !== Number(expectedRow.specificityScore)
      ) {
        matches = false;
      }
      if (expectedRow.type && rel.type !== expectedRow.type) {
        matches = false;
      }
      return matches;
    });

    assert.exists(
      match,
      `No active interaction matched criteria: ${JSON.stringify(expectedRow)} in ${JSON.stringify(active)}`
    );
  }
);

Then(
  'the shadowed rules count should be {int}',
  function (this: AgroWorld, expectedCount: number) {
    const ctx = getContext(this);
    assert.exists(ctx.evaluationResult, 'Evaluation result does not exist');
    assert.strictEqual(ctx.evaluationResult.shadowedRulesCount, expectedCount);
  }
);

Then(
  'no active companion interactions are resolved',
  function (this: AgroWorld) {
    const ctx = getContext(this);
    assert.exists(ctx.evaluationResult, 'Evaluation result does not exist');
    assert.strictEqual(ctx.evaluationResult.activeRelations.length, 0);
  }
);
