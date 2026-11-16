import { z } from 'zod';

import { UuidValidator } from '../valueObject/UuidValidator.js';

export const kafkaDomainEventEnvelopeSchema = z.object({
  eventId: z.string().refine((id) => UuidValidator.isValidV7(id), {
    message: 'Expected eventId to be a valid UUIDv7'
  }),
  eventName: z.string().min(1),
  aggregateId: z.string().refine((id) => UuidValidator.isValid(id), {
    message: 'Expected aggregateId to be a valid UUID'
  }),
  occurredAt: z.iso.datetime(),
  payload: z.looseObject({
    plantId: z
      .string()
      .refine((id) => UuidValidator.isValid(id), {
        message: 'Expected plantId to be a valid UUID'
      })
      .optional(),
    userId: z
      .string()
      .refine((id) => UuidValidator.isValid(id), {
        message: 'Expected userId to be a valid UUID'
      })
      .optional(),
    likedAt: z.iso.datetime().optional()
  })
});

export type KafkaDomainEventEnvelope = z.infer<
  typeof kafkaDomainEventEnvelopeSchema
>;
