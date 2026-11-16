import { z } from 'zod';

import { REQUEST_LIMITS } from './requestSchemas.js';

const NOT_BLANK = /\S/;

export const requiredShortTextResponseSchema = z
  .string()
  .min(1)
  .max(REQUEST_LIMITS.shortText)
  .regex(NOT_BLANK);

export const requiredLongTextResponseSchema = z
  .string()
  .min(1)
  .max(REQUEST_LIMITS.longText)
  .regex(NOT_BLANK);

const dateResponseSchema = z
  .date()
  .or(z.iso.datetime().transform((value) => new Date(value)));

export const metadataResponseSchema = z.object({
  createdAt: dateResponseSchema,
  createdBy: z.string(),
  updatedAt: dateResponseSchema,
  updatedBy: z.string()
});

export const fieldsetMask = <K extends string>(
  fields: readonly K[]
): Partial<Record<K | 'id', true>> =>
  Object.fromEntries(
    ['id', ...fields].map((field) => [field, true] as const)
  ) as Partial<Record<K | 'id', true>>;
