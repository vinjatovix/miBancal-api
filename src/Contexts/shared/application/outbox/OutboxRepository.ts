import type { DomainEvent } from '../../domain/events/index.js';

/**
 * Stages domain events into the durable `outbox` collection as part of the
 * active unit of work.
 *
 * Contract:
 * - `stage([])` is a no-op: no driver call is issued for an empty batch.
 * - Writes join the active `ClientSession` (the Unit of Work transaction), so
 *   staging commits or rolls back atomically with the aggregate mutation.
 * - Insert failures are never swallowed; they propagate so the transaction
 *   aborts (FR-008).
 */
export interface OutboxRepository {
  stage(events: DomainEvent[]): Promise<void>;
}
