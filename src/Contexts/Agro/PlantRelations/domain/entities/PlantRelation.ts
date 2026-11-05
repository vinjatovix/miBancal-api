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
import { TaxonomicScope } from '../valueObjects/TaxonomicScope.js';
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
  source: TaxonomicScope;
  target: TaxonomicScope;
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

    const source =
      props.source ??
      (props.sourcePlantId
        ? TaxonomicScope.plant(props.sourcePlantId)
        : undefined);
    const target =
      props.target ??
      (props.targetPlantId
        ? TaxonomicScope.plant(props.targetPlantId)
        : undefined);

    if (!source || !target) {
      throw new InvalidArgumentException(
        '<PlantRelation> source and target are required'
      );
    }

    this.ensureValidId(props.id);
    this.ensureNonBroadcastSource(source);
    this.ensureDistinctParticipants(source, target);
    this.ensureValidType(props.type);
    this.ensureValidMechanism(props.mechanism);
    this.ensureValidStrength(props.strength);
    this.ensureValidProximity(props.proximity);
    this.ensureValidReason(props.reason);

    const version = props.version ?? 0;
    this.ensureValidVersion(version);

    this.props = Object.freeze({
      id: props.id,
      source,
      target,
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
    const source =
      params.source ??
      (params.sourcePlantId
        ? TaxonomicScope.plant(params.sourcePlantId)
        : undefined);
    const target =
      params.target ??
      (params.targetPlantId
        ? TaxonomicScope.plant(params.targetPlantId)
        : undefined);

    if (!source || !target) {
      throw new InvalidArgumentException(
        '<PlantRelation> source and target are required'
      );
    }

    return new PlantRelation({
      id: params.id ?? randomPlantRelationId(),
      source,
      target,
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
    const source = primitives.source
      ? TaxonomicScope.fromPrimitives(primitives.source)
      : TaxonomicScope.plant(primitives.sourcePlantId!);
    const target = primitives.target
      ? TaxonomicScope.fromPrimitives(primitives.target)
      : TaxonomicScope.plant(primitives.targetPlantId!);

    return new PlantRelation({
      id: createPlantRelationId(primitives.id),
      source,
      target,
      type: primitives.type,
      mechanism: primitives.mechanism,
      strength: primitives.strength,
      proximity: ProximityDistance.fromPrimitives(primitives.proximity),
      reason: primitives.reason,
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }

  get source(): TaxonomicScope {
    return this.props.source;
  }

  get target(): TaxonomicScope {
    return this.props.target;
  }

  get sourcePlantId(): PlantId | undefined {
    return this.props.source.isPlant() && this.props.source.value
      ? createPlantId(this.props.source.value)
      : undefined;
  }

  get targetPlantId(): PlantId | undefined {
    return this.props.target.isPlant() && this.props.target.value
      ? createPlantId(this.props.target.value)
      : undefined;
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
      source:
        this.props.source.toPrimitives() as PlantRelationPrimitives['source'],
      target: this.props.target.toPrimitives(),
      ...(this.props.source.isPlant() && this.props.source.value
        ? { sourcePlantId: this.props.source.value }
        : {}),
      ...(this.props.target.isPlant() && this.props.target.value
        ? { targetPlantId: this.props.target.value }
        : {}),
      type: this.props.type,
      mechanism: this.props.mechanism,
      strength: this.props.strength,
      proximity: this.props.proximity.toPrimitives(),
      reason: this.props.reason,
      metadata: this.props.metadata.toPrimitives(),
      version: this.props.version
    };
  }

  private ensureNonBroadcastSource(source: TaxonomicScope): void {
    if (source.isAll()) {
      throw new InvalidArgumentException(
        '<PlantRelation> source scope cannot be broadcast "all"'
      );
    }
  }

  private ensureDistinctParticipants(
    source: TaxonomicScope,
    target: TaxonomicScope
  ): void {
    if (
      source.scope === target.scope &&
      source.value !== undefined &&
      target.value !== undefined &&
      source.value.toLowerCase() === target.value.toLowerCase()
    ) {
      throw new InvalidArgumentException(
        '<PlantRelation> source and target participants must be distinct'
      );
    }
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
