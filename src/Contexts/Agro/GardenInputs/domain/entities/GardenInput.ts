import { validate as validateUuid } from 'uuid';

import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { isRecord } from '../../../../../shared/domain/utils/isRecord.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { uniqueTextList } from '../../../../../shared/domain/utils/uniqueTextList.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import {
  normaliseSupportResources,
  type SupportResourcePrimitives
} from '../../../shared/domain/supportResource/index.js';
import type { GardenInputId } from '../GardenInputId.js';
import {
  GARDEN_INPUT_ACTIONS,
  GARDEN_INPUT_APPLICATION_METHODS,
  GARDEN_INPUT_CATEGORIES,
  type GardenInputAction,
  type GardenInputCategory,
  type GardenInputChanges,
  type GardenInputDosagePrimitives,
  type GardenInputProps,
  type GardenInputRecipePrimitives,
  type GardenInputStatus,
  type GardenInputStoragePrimitives
} from './types/index.js';

type GardenInputState = GardenInputProps & {
  status: GardenInputStatus;
  version: number;
};

const KEBAB_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const gardenInputText = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentException(`GardenInput.${field} is required`);
  }
  return requiredText(value, `GardenInput.${field}`);
};

const normaliseSlug = (value: unknown): string => {
  const text = gardenInputText(value, 'slug');
  if (!KEBAB_SLUG_PATTERN.test(text)) {
    throw new InvalidArgumentException(
      `GardenInput.slug must be a strict kebab-case string, received: ${text}`
    );
  }
  if (validateUuid(text)) {
    throw new InvalidArgumentException(
      'GardenInput.slug cannot have the shape of a UUID'
    );
  }
  return text;
};

const normaliseCategory = (value: unknown): GardenInputCategory => {
  if (
    typeof value !== 'string' ||
    !GARDEN_INPUT_CATEGORIES.includes(value as GardenInputCategory)
  ) {
    throw new InvalidArgumentException(
      `GardenInput.category must be one of: ${GARDEN_INPUT_CATEGORIES.join(', ')}`
    );
  }
  return value as GardenInputCategory;
};

const normaliseActions = (
  actions?: readonly unknown[]
): GardenInputAction[] | undefined => {
  if (!actions || actions.length === 0) return undefined;
  const valid = new Set<GardenInputAction>();
  for (const action of actions) {
    if (
      typeof action !== 'string' ||
      !GARDEN_INPUT_ACTIONS.includes(action as GardenInputAction)
    ) {
      throw new InvalidArgumentException(
        `GardenInput.actions must be one of: ${GARDEN_INPUT_ACTIONS.join(', ')}`
      );
    }
    valid.add(action as GardenInputAction);
  }
  return valid.size > 0 ? [...valid] : undefined;
};

const normaliseIngredients = (
  ingredients?: readonly unknown[]
): { item: string; quantity: string }[] => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new InvalidArgumentException(
      'GardenInput recipe requires at least one ingredient'
    );
  }
  return ingredients.map((rawIng) => {
    const ing: Record<string, unknown> = isRecord(rawIng) ? rawIng : {};
    return {
      item: gardenInputText(ing.item, 'recipes.ingredients.item'),
      quantity: gardenInputText(ing.quantity, 'recipes.ingredients.quantity')
    };
  });
};

const normaliseInstructions = (instructions?: readonly unknown[]): string[] => {
  if (!Array.isArray(instructions) || instructions.length === 0) {
    throw new InvalidArgumentException(
      'GardenInput recipe requires at least one instruction'
    );
  }
  return instructions.map((ins) =>
    gardenInputText(ins, 'recipes.instructions')
  );
};

const normaliseDosage = (
  dosage?: GardenInputDosagePrimitives
): GardenInputDosagePrimitives => {
  if (!dosage || !GARDEN_INPUT_APPLICATION_METHODS.includes(dosage.method)) {
    throw new InvalidArgumentException(
      `GardenInput recipe dosage requires a valid method in ${GARDEN_INPUT_APPLICATION_METHODS.join(', ')}`
    );
  }
  return {
    method: dosage.method,
    dilution: gardenInputText(dosage.dilution, 'recipes.dosage.dilution'),
    frequency: gardenInputText(dosage.frequency, 'recipes.dosage.frequency')
  };
};

const normaliseStorage = (
  storage?: GardenInputStoragePrimitives
): GardenInputStoragePrimitives | undefined => {
  if (!storage) return undefined;
  return {
    duration: gardenInputText(storage.duration, 'recipes.storage.duration'),
    conditions: gardenInputText(
      storage.conditions,
      'recipes.storage.conditions'
    ),
    ...(storage.spoilageSigns !== undefined && {
      spoilageSigns: gardenInputText(
        storage.spoilageSigns,
        'recipes.storage.spoilageSigns'
      )
    })
  };
};

const normaliseRecipe = (
  recipe: GardenInputRecipePrimitives
): GardenInputRecipePrimitives => {
  const name = gardenInputText(recipe.name, 'recipes.name');
  const description =
    recipe.description !== undefined
      ? gardenInputText(recipe.description, 'recipes.description')
      : undefined;
  const brewTime =
    recipe.brewTime !== undefined
      ? gardenInputText(recipe.brewTime, 'recipes.brewTime')
      : undefined;

  const storage = normaliseStorage(recipe.storage);
  const safetyNotes =
    recipe.safetyNotes && recipe.safetyNotes.length > 0
      ? uniqueTextList(recipe.safetyNotes, 'recipes.safetyNotes')
      : undefined;

  return {
    name,
    ...(description && { description }),
    ingredients: normaliseIngredients(recipe.ingredients),
    instructions: normaliseInstructions(recipe.instructions),
    ...(brewTime && { brewTime }),
    dosage: normaliseDosage(recipe.dosage),
    ...(storage && { storage }),
    ...(safetyNotes && safetyNotes.length > 0 && { safetyNotes })
  };
};

const normaliseRecipes = (
  recipes?: readonly GardenInputRecipePrimitives[]
): GardenInputRecipePrimitives[] | undefined => {
  if (!recipes || recipes.length === 0) return undefined;
  return recipes.map(normaliseRecipe);
};

const normaliseTextList = (
  list?: readonly string[],
  fieldName?: string
): string[] | undefined => {
  if (!list || list.length === 0) return undefined;
  const unique = uniqueTextList(list, fieldName ?? 'list');
  return unique.length > 0 ? unique : undefined;
};

const assignGuidance = (
  result: GardenInputProps,
  props: GardenInputProps
): void => {
  const actions = normaliseActions(props.actions);
  if (actions !== undefined) result.actions = actions;

  const activeIngredients = normaliseTextList(
    props.activeIngredients,
    'GardenInput.activeIngredients'
  );
  if (activeIngredients !== undefined) {
    result.activeIngredients = activeIngredients;
  }

  const nutrients = normaliseTextList(props.nutrients, 'GardenInput.nutrients');
  if (nutrients !== undefined) result.nutrients = nutrients;

  const targets = normaliseTextList(props.targets, 'GardenInput.targets');
  if (targets !== undefined) result.targets = targets;
};

const assignRecipesAndResources = (
  result: GardenInputProps,
  props: GardenInputProps
): void => {
  const recipes = normaliseRecipes(props.recipes);
  if (recipes !== undefined) result.recipes = recipes;

  const resources = props.resources
    ? normaliseSupportResources(props.resources, 'GardenInput.resources')
    : undefined;
  if (resources !== undefined && resources.length > 0) {
    result.resources = resources;
  }
};

const applySingleChange = <K extends keyof GardenInputProps>(
  draft: GardenInputProps,
  key: K,
  value: GardenInputProps[K] | null | undefined
): void => {
  if (value === undefined) return;
  if (value === null) delete draft[key];
  else draft[key] = value;
};

export class GardenInput extends AggregateRoot<GardenInputId> {
  private props: GardenInputState;

  private constructor(props: GardenInputProps) {
    super(props.id);
    this.props = Object.freeze({
      ...GardenInput.normalise(props),
      status: props.status ?? 'active',
      version: props.version ?? 0
    });
  }

  get idValue(): string {
    return this.id;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get category(): GardenInputCategory {
    return this.props.category;
  }

  get actions(): GardenInputAction[] | undefined {
    return this.props.actions;
  }

  get activeIngredients(): string[] | undefined {
    return this.props.activeIngredients;
  }

  get nutrients(): string[] | undefined {
    return this.props.nutrients;
  }

  get targets(): string[] | undefined {
    return this.props.targets;
  }

  get recipes(): GardenInputRecipePrimitives[] | undefined {
    return this.props.recipes;
  }

  get resources(): SupportResourcePrimitives[] | undefined {
    return this.props.resources;
  }

  get status(): GardenInputStatus {
    return this.props.status;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  isDeleted(): boolean {
    return this.props.status === 'deleted';
  }

  assertActive(): void {
    if (this.isDeleted()) {
      throw new DomainConflictException('Cannot mutate a deleted garden input');
    }
  }

  private static normalise(props: GardenInputProps): GardenInputProps {
    if (!props.metadata) {
      throw new InvalidArgumentException('GardenInput.metadata is required');
    }

    GardenInput.assertSoftDeleteConsistency(props);

    const result: GardenInputProps = {
      id: props.id,
      slug: normaliseSlug(props.slug),
      name: gardenInputText(props.name, 'name'),
      category: normaliseCategory(props.category),
      metadata: props.metadata
    };

    if (props.description !== undefined) {
      result.description = gardenInputText(props.description, 'description');
    }

    assignGuidance(result, props);
    assignRecipesAndResources(result, props);

    if (props.deletedAt !== undefined) result.deletedAt = props.deletedAt;

    return result;
  }

  private static assertSoftDeleteConsistency(props: GardenInputProps): void {
    const status = props.status ?? 'active';
    if (status === 'active' && props.deletedAt) {
      throw new InvalidArgumentException(
        'Active garden input cannot have deletedAt'
      );
    }
    if (status === 'deleted' && !props.deletedAt) {
      throw new InvalidArgumentException(
        'Deleted garden input must have deletedAt'
      );
    }
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  updateDetails(
    changes: GardenInputChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const draft: GardenInputProps = { ...this.props };

    if (changes.name !== undefined) draft.name = changes.name;
    if (changes.category !== undefined) draft.category = changes.category;

    applySingleChange(draft, 'description', changes.description);
    applySingleChange(draft, 'actions', changes.actions);
    applySingleChange(draft, 'activeIngredients', changes.activeIngredients);
    applySingleChange(draft, 'nutrients', changes.nutrients);
    applySingleChange(draft, 'targets', changes.targets);
    applySingleChange(draft, 'recipes', changes.recipes);
    applySingleChange(draft, 'resources', changes.resources);

    const candidate = GardenInput.normalise(draft);

    if (
      !hasStateChanged(
        GardenInput.snapshot(this.props),
        GardenInput.snapshot(candidate)
      )
    ) {
      return;
    }

    this.props = Object.freeze({
      ...candidate,
      status: this.props.status,
      ...(this.props.deletedAt ? { deletedAt: this.props.deletedAt } : {}),
      version: this.props.version,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  markAsDeleted(user: string, at: Date = new Date()): void {
    if (this.isDeleted()) return;

    this.props = Object.freeze({
      ...this.props,
      status: 'deleted',
      deletedAt: at,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  private static snapshot(props: GardenInputProps): UnknownRecord {
    const {
      metadata: _metadata,
      version: _version,
      status: _status,
      deletedAt: _deletedAt,
      ...content
    } = props;

    return content;
  }

  static create(props: GardenInputProps): GardenInput {
    return new GardenInput(props);
  }
}
