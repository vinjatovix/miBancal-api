import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/UuidValidator.js';
import type {
  TaxonomicScopePrimitives,
  TaxonomicScopeType
} from './types/TaxonomicScopePrimitives.js';

const GENUS_REGEX = /^[A-Z][a-zA-Z]{1,49}$/;

export class TaxonomicScope {
  readonly scope: TaxonomicScopeType;
  readonly value?: string | undefined;

  private constructor(scope: TaxonomicScopeType, value?: string) {
    this.scope = scope;
    this.value = value;
  }

  static plant(plantId: string): TaxonomicScope {
    const normalized = plantId?.trim().toLowerCase();
    if (!normalized || !UuidValidator.isValid(normalized)) {
      throw new InvalidArgumentException(
        `<TaxonomicScope> plant id must be a valid UUID, got: ${plantId}`
      );
    }
    return new TaxonomicScope('plant', normalized);
  }

  static genus(genusName: string): TaxonomicScope {
    const trimmed = genusName?.trim();
    if (!trimmed || !GENUS_REGEX.test(trimmed)) {
      throw new InvalidArgumentException(
        `<TaxonomicScope> genus must be a capitalized alphabetic word with length 2-50, got: ${genusName}`
      );
    }
    const normalized =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    return new TaxonomicScope('genus', normalized);
  }

  static family(familyId: string): TaxonomicScope {
    const normalized = familyId?.trim().toLowerCase();
    if (!normalized || !UuidValidator.isValid(normalized)) {
      throw new InvalidArgumentException(
        `<TaxonomicScope> family id must be a valid UUID, got: ${familyId}`
      );
    }
    return new TaxonomicScope('family', normalized);
  }

  static all(): TaxonomicScope {
    return new TaxonomicScope('all');
  }

  static fromPrimitives(primitives: TaxonomicScopePrimitives): TaxonomicScope {
    switch (primitives.scope) {
      case 'plant':
        if (!primitives.value) {
          throw new InvalidArgumentException(
            '<TaxonomicScope> plant scope requires a value'
          );
        }
        return TaxonomicScope.plant(primitives.value);

      case 'genus':
        if (!primitives.value) {
          throw new InvalidArgumentException(
            '<TaxonomicScope> genus scope requires a value'
          );
        }
        return TaxonomicScope.genus(primitives.value);

      case 'family':
        if (!primitives.value) {
          throw new InvalidArgumentException(
            '<TaxonomicScope> family scope requires a value'
          );
        }
        return TaxonomicScope.family(primitives.value);

      case 'all':
        if (primitives.value !== undefined) {
          throw new InvalidArgumentException(
            '<TaxonomicScope> broadcast scope "all" must not have a value'
          );
        }
        return TaxonomicScope.all();

      default:
        throw new InvalidArgumentException(
          `<TaxonomicScope> invalid scope type: ${primitives.scope as string}`
        );
    }
  }

  isPlant(): boolean {
    return this.scope === 'plant';
  }

  isGenus(): boolean {
    return this.scope === 'genus';
  }

  isFamily(): boolean {
    return this.scope === 'family';
  }

  isAll(): boolean {
    return this.scope === 'all';
  }

  equals(other: TaxonomicScope): boolean {
    return this.scope === other.scope && this.value === other.value;
  }

  toPrimitives(): TaxonomicScopePrimitives {
    return {
      scope: this.scope,
      ...(this.value !== undefined ? { value: this.value } : {})
    };
  }
}
