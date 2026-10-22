import { v7 as uuidv7 } from 'uuid';
import { InvalidArgumentException } from '../errors/InvalidArgumentException.js';
import { UuidValidator } from './UuidValidator.js';

export interface IdGenerator<T extends string> {
  create(value: string): T;
  random(): T;
}

export function createIdGenerator<T extends string>(
  entityName: string
): IdGenerator<T> {
  return {
    create(value: string): T {
      const normalizedValue = value.trim().toLowerCase();
      if (!UuidValidator.isValid(normalizedValue)) {
        throw new InvalidArgumentException(
          `${entityName} <${value}> is not a valid UUID`
        );
      }
      return normalizedValue as T;
    },
    random(): T {
      return uuidv7() as T;
    }
  };
}
