import { uniqueTextList } from '../../../../../shared/domain/utils/uniqueTextList.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { SupportResourcePrimitives } from './SupportResourcePrimitives.js';
import {
  SUPPORT_RESOURCE_TYPES,
  type SupportResourceType
} from './SupportResourceType.js';

const assertType = (value: unknown, path: string): SupportResourceType => {
  if (
    typeof value !== 'string' ||
    !SUPPORT_RESOURCE_TYPES.includes(value as SupportResourceType)
  ) {
    throw new InvalidArgumentException(
      `${path}.type must be one of: ${SUPPORT_RESOURCE_TYPES.join(', ')}`
    );
  }

  return value as SupportResourceType;
};

const assertUrl = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidArgumentException(`${path}.url is required`);
  }

  return value.trim();
};

/** A present label is trimmed; a blank one is dropped (never stored as `""`). */
const trimmedLabel = (value: unknown, path: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidArgumentException(`${path} must be a text`);
  }
  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
};

const normaliseOne = (
  resource: SupportResourcePrimitives,
  path: string
): SupportResourcePrimitives => {
  const type = assertType(resource.type, path);
  const url = assertUrl(resource.url, path);
  const title = trimmedLabel(resource.title, `${path}.title`);
  const source = trimmedLabel(resource.source, `${path}.source`);
  const tags =
    resource.tags === undefined
      ? undefined
      : uniqueTextList(resource.tags, `${path}.tags`);

  return {
    type,
    url,
    ...(title !== undefined && { title }),
    ...(source !== undefined && { source }),
    ...(tags !== undefined && tags.length > 0 && { tags })
  };
};

/**
 * Shared support-resource guard: trims labels, drops blank/case-insensitive
 * duplicate tags, and asserts every entry has a recognised `type` and a present
 * `url`. Pure domain — no DB, Express or Zod. An image is never required here
 * (FR-002); the mandatory-image rule stays plant-specific.
 */
export const normaliseSupportResources = (
  resources: readonly SupportResourcePrimitives[],
  path = 'SupportResource'
): SupportResourcePrimitives[] =>
  resources.map((resource, index) =>
    normaliseOne(resource, `${path}.${index}`)
  );
