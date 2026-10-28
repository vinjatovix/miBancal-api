import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { createPlantId, type PlantId } from '../../../Plants/domain/PlantId.js';
import {
  createPlantRelationId,
  randomPlantRelationId,
  type PlantRelationId
} from '../PlantRelationId.js';
import { ProximityDistance } from '../valueObjects/ProximityDistance.js';
import {
  PlantRelationMechanisms,
  type PlantRelationMechanism
} from './types/PlantRelationMechanism.js';
import type {
  CreatePlantRelationParams,
  PlantRelationParameters
} from './types/PlantRelationParameters.js';
import type { PlantRelationPrimitives } from './types/PlantRelationPrimitives.js';
import type { PlantRelationProps } from './types/PlantRelationProps.js';
import {
  PlantRelationTypes,
  type PlantRelationType
} from './types/PlantRelationType.js';

type PlantRelationState = {
  id: PlantRelationId;
  sourcePlantId: PlantId;
  targetPlantId: PlantId;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: ProximityDistance;
  reason: string;
  metadata: Metadata;
  version: number;
};

export class PlantRelation extends AggregateRoot<PlantRelationId> {
  private props: Readonly<PlantRelationState>;

  constructor(props: PlantRelationProps) {
    super(props.id);

    this.ensureValidId(props.id);
    this.ensureDistinctPlants(props.sourcePlantId, props.targetPlantId);
    this.ensureValidPlantIds(props.sourcePlantId, props.targetPlantId);
    this.ensureValidType(props.type);
    this.ensureValidMechanism(props.mechanism);
    this.ensureValidStrength(props.strength);
    this.ensureValidProximity(props.proximity);
    this.ensureValidReason(props.reason);

    const version = props.version ?? 0;
    this.ensureValidVersion(version);

    this.props = Object.freeze({
      id: props.id,
      sourcePlantId: props.sourcePlantId,
      targetPlantId: props.targetPlantId,
      type: props.type,
      mechanism: props.mechanism,
      strength: props.strength,
      proximity: props.proximity,
      reason: props.reason.trim(),
      metadata: props.metadata,
      version
    });
  }

  static create(params: CreatePlantRelationParams): PlantRelation {
    const at = params.at ?? new Date();

    return new PlantRelation({
      id: params.id ?? randomPlantRelationId(),
      sourcePlantId: params.sourcePlantId,
      targetPlantId: params.targetPlantId,
      type: params.type,
      mechanism: params.mechanism,
      strength: params.strength,
      proximity: params.proximity,
      reason: params.reason,
      metadata: Metadata.create(params.user, at),
      version: 0
    });
  }

  static fromPrimitives(primitives: PlantRelationPrimitives): PlantRelation {
    return new PlantRelation({
      id: createPlantRelationId(primitives.id),
      sourcePlantId: createPlantId(primitives.sourcePlantId),
      targetPlantId: createPlantId(primitives.targetPlantId),
      type: primitives.type,
      mechanism: primitives.mechanism,
      strength: primitives.strength,
      proximity: ProximityDistance.fromPrimitives(primitives.proximity),
      reason: primitives.reason,
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }

  get sourcePlantId(): PlantId {
    return this.props.sourcePlantId;
  }

  get targetPlantId(): PlantId {
    return this.props.targetPlantId;
  }

  get type(): PlantRelationType {
    return this.props.type;
  }

  get mechanism(): PlantRelationMechanism {
    return this.props.mechanism;
  }

  get strength(): number {
    return this.props.strength;
  }

  get proximity(): ProximityDistance {
    return this.props.proximity;
  }

  get reason(): string {
    return this.props.reason;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  updateParameters(
    params: PlantRelationParameters,
    user: string,
    at: Date = new Date()
  ): void {
    this.ensureValidType(params.type);
    this.ensureValidMechanism(params.mechanism);
    this.ensureValidStrength(params.strength);
    this.ensureValidProximity(params.proximity);
    this.ensureValidReason(params.reason);

    const before = {
      type: this.props.type,
      mechanism: this.props.mechanism,
      strength: this.props.strength,
      proximity: this.props.proximity.toPrimitives(),
      reason: this.props.reason
    };
    const after = {
      type: params.type,
      mechanism: params.mechanism,
      strength: params.strength,
      proximity: params.proximity.toPrimitives(),
      reason: params.reason.trim()
    };

    if (!hasStateChanged(before, after)) {
      return;
    }

    this.props = Object.freeze({
      ...this.props,
      type: params.type,
      mechanism: params.mechanism,
      strength: params.strength,
      proximity: params.proximity,
      reason: params.reason.trim(),
      metadata: Metadata.update(this.props.metadata, user, at),
      version: this.props.version + 1
    });
  }

  toPrimitives(): PlantRelationPrimitives {
    return {
      id: this.props.id,
      sourcePlantId: this.props.sourcePlantId,
      targetPlantId: this.props.targetPlantId,
      type: this.props.type,
      mechanism: this.props.mechanism,
      strength: this.props.strength,
      proximity: this.props.proximity.toPrimitives(),
      reason: this.props.reason,
      metadata: this.props.metadata.toPrimitives(),
      version: this.props.version
    };
  }

  private ensureDistinctPlants(
    sourcePlantId: string,
    targetPlantId: string
  ): void {
    if (sourcePlantId === targetPlantId) {
      throw new InvalidArgumentException(
        '<PlantRelation> sourcePlantId and targetPlantId must be distinct'
      );
    }
  }

  private ensureValidPlantIds(
    sourcePlantId: string,
    targetPlantId: string
  ): void {
    createPlantId(sourcePlantId);
    createPlantId(targetPlantId);
  }

  private ensureValidType(type: PlantRelationType): void {
    if (!PlantRelationTypes.includes(type)) {
      throw new InvalidArgumentException(
        `<PlantRelation> type must be one of: ${PlantRelationTypes.join(', ')}`
      );
    }
  }

  private ensureValidMechanism(mechanism: PlantRelationMechanism): void {
    if (!PlantRelationMechanisms.includes(mechanism)) {
      throw new InvalidArgumentException(
        `<PlantRelation> mechanism must be one of: ${PlantRelationMechanisms.join(', ')}`
      );
    }
  }

  private ensureValidStrength(strength: number): void {
    if (!Number.isInteger(strength) || strength < 1 || strength > 5) {
      throw new InvalidArgumentException(
        `<PlantRelation> strength must be an integer between 1 and 5: ${strength}`
      );
    }
  }

  private ensureValidId(id: string): void {
    createPlantRelationId(id);
  }

  private ensureValidProximity(proximity: unknown): void {
    if (!(proximity instanceof ProximityDistance)) {
      throw new InvalidArgumentException(
        '<PlantRelation> proximity must be an instance of ProximityDistance'
      );
    }
  }

  private ensureValidReason(reason: string): void {
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      throw new InvalidArgumentException(
        '<PlantRelation> reason must be a non-empty string'
      );
    }
  }

  private ensureValidVersion(version: number): void {
    if (!Number.isInteger(version) || version < 0) {
      throw new InvalidArgumentException(
        `<PlantRelation> version must be a non-negative integer: ${version}`
      );
    }
  }
}
