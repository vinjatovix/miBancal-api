# MODULE: DISTRIBUTED EVENT BUS (KAFKA)

version: 1.4.0
source-spec: v1.4.0
status: evolving

---

## 1. PURPOSE `[TARGET STATE — built foundation-first: in-process bus in Iterations [45b](../../roadmap.md#iteration-45b-establish-domain-event-primitives-and-aggregate-recording)–[45d](../../roadmap.md#iteration-45d-publish-domain-events-from-use-cases-and-wire-first-in-process-consumer); reliability (Outbox) in Iterations 46–48; Kafka distribution in Iterations 49–51]`

Defines the event-driven integration layer of MiBancal.

It specifies how modules publish and consume asynchronous **Domain Events** to trigger cross-module workflows (such as updating or dismissing scheduled Reminders when plants are removed or watered) in a decoupled, resilient, and chronological manner.

This module is strictly isolated from **Agricultural Events** (`cultivation-logs.md`), which represent the user-logged horticultural log journal.

---

## 2. PORT & ADAPTERS

To keep the application and domain layers free of infrastructure dependencies, all event-driven messaging is designed around the Port and Adapter pattern:

### 2.0 Domain Event Primitives (`DomainEvent`, `AggregateRoot` record/pull) `[DELIVERED — [Iteration 45b](../../roadmap.md#iteration-45b-establish-domain-event-primitives-and-aggregate-recording), 2026-11-13]`

The technology-agnostic foundation the port below depends on, living entirely in the domain layer:

- **`DomainEvent<Payload>`** — abstract base at `src/Contexts/shared/domain/events/DomainEvent.ts` (re-exported via the `events/` barrel). Carries a UUIDv7 `eventId` (chronologically sortable), `occurredAt`, `aggregateId`, stable `eventName`, and a typed `payload`. `eventId`/`occurredAt` default on a fresh fact and are preserved verbatim on reconstitution. Zero persistence/messaging/transport imports (only the reused `uuid` v7 generator).
- **`AggregateRoot.record(event)` / `pullDomainEvents()`** — an in-memory, instance-scoped buffer: `record` appends in order, `pullDomainEvents` returns a copy in recorded order then drains. The buffer is not part of `props`/`toPrimitives`, so it stays invisible to repository delta computation. The existing `AggregateRoot<TId>` contract is unchanged; all current subclasses compile unmodified.

The `publish(events)` seam in 2.1 and use-case publishing (Iteration 45d) consume exactly these primitives.

### 2.1 Event Bus Port (`EventBus`) `[DELIVERED — [Iteration 45c](../../roadmap.md#iteration-45c-define-eventbus-port-and-in-process-inmemory-adapter), 2026-11-14]`

A technology-agnostic interface defined in the application layer at `src/Contexts/shared/application/eventBus/EventBus.ts` (re-exported via the `eventBus/` barrel). This port is the stable seam every consumer depends on: the InMemory, Outbox-backed and Kafka adapters are interchangeable implementations behind it, so consumer business logic is written once (Iteration 45d) and never changes when reliability or distribution are added later. It imports only the domain `DomainEvent` — zero persistence/messaging/transport coupling.

- `publish(events: DomainEvent[]): Promise<void>`
- `subscribe(eventName: string, handler: EventHandler): void`
- `type EventHandler = (event: DomainEvent) => Promise<void>`

The routing key is the `DomainEvent.eventName` field (Iteration 45b); the port reuses that primitive rather than introducing a parallel event or envelope concept (envelope/versioning in §3.5 is deferred to the Kafka iterations).

### 2.2 InMemory Adapter (`InMemoryEventBusAdapter`) `[DELIVERED — [Iteration 45c](../../roadmap.md#iteration-45c-define-eventbus-port-and-in-process-inmemory-adapter), 2026-11-14]`

- A lightweight, synchronous, in-process implementation at `src/Contexts/shared/infrastructure/eventBus/InMemoryEventBusAdapter.ts`. Keeps subscriptions in a `Map<string, EventHandler[]>`; `publish` dispatches events in batch order and, per event, awaits each handler subscribed to its `eventName` in registration order. Empty publishes and events with no subscribers are successful no-ops; a rejecting handler propagates out of `publish` (fail-fast — no swallow, no retry, no buffering this iteration).
- **This is the first event-bus deliverable, not a test-only fallback.** It makes the whole event-driven architecture functional and testable before any broker exists; every cross-module consumer is authored and validated against it (Iteration 45d) ahead of the Outbox (reliability) and Kafka (distribution) iterations.
- Designed for local developer builds, fast unit tests, and Cucumber ATDD step scenarios without external broker dependencies.
- **Central wiring**: the bus is registered as an Awilix singleton (`eventBus`), and subscriptions are declared in one assembly-time registry module (`src/apps/agroApi/wiring/eventSubscriptions.ts`) resolved once by `createAppContainer`. Adding or removing a consumer is a single edit to the `EVENT_SUBSCRIPTIONS` list. The list is empty this iteration; the first consumer is wired in Iteration 45d.

### 2.3 Kafka Adapter (`KafkaEventBusAdapter`) `[DELIVERED — [Iteration 49](../../roadmap.md#iteration-49-route-events-to-kafka-domain-topic-by-partition-key), 2026-11-15]`

- A production adapter utilizing `kafkajs` to stream messages to Apache Kafka, implemented behind the outbox worker's `EventForwarder` seam (not the API-side `EventBus` port — the HTTP API keeps staging transactionally through the in-process Outbox adapter).
- Publishes every staged outbox event to the single domain topic `agro.domain.events` (configurable via `KAFKA_TOPIC`). The message **key** is the dynamic partition key from `derivePartitionKey` (§3.2); the **value** is the record's unaltered stored representation (`eventId`, `eventName`, `aggregateId`, `occurredAt`, `payload`).
- Durability is `acks: all` (`-1`): `forward()` resolves only on the broker's durable acknowledgement and rejects on exhausted retries, so a publish failure leaves the record pending (never flagged `processedAt`) and eligible for redelivery — at-least-once.
- Owns the producer/admin lifecycle: on worker start it connects the producer and idempotently ensures the topic (default 6 partitions; replication factor configurable via `KAFKA_TOPIC_REPLICATION_FACTOR`, default 1 for a single-node broker, raise to ≥3 on a multi-broker managed cluster). Ensure is **best-effort**: it skips creation when the topic already exists and swallows a denied topic-admin operation (logging a warning), so a managed broker that provisions the topic out-of-band and withholds admin rights from the app credential never blocks worker startup — a still-missing topic surfaces as a retryable `forward()` failure that leaves the record pending (at-least-once). On stop it disconnects. The broker is a single-node Apache Kafka (KRaft) service in the shared Docker Compose stack — the same engine local/CI/prod, with only `KAFKA_BROKERS` differing, governed exclusively by the worker's own config slice (fail-fast when `KAFKA_BROKERS` is missing). Envelope versioning / schema registry remains deferred (§3.5).

---

## 3. RESILIENCE & DATA INTEGRITY PATTERNS

### 3.1 Transactional Outbox Pattern with Change Streams & Fallback Polling `[CRITICAL SECURITY RULE] [PARTIALLY BUILT — store & index in [Iteration 46](../../roadmap.md#iteration-46-create-transactional-outbox-collection), atomic write in [Iteration 47](../../roadmap.md#iteration-47-write-domain-events-to-outbox-within-transactions), Change Stream tailer & fallback in [Iteration 48](../../roadmap.md#iteration-48-implement-mongodb-change-stream-tailer-for-outbox), Kafka hand-off & dispatch flagging in [Iteration 49](../../roadmap.md#iteration-49-route-events-to-kafka-domain-topic-by-partition-key); only the age-based cleanup sweep (item 4) pending Iterations 50+]`

> **Built state ([Iteration 46](../../roadmap.md#iteration-46-create-transactional-outbox-collection), [Iteration 47](../../roadmap.md#iteration-47-write-domain-events-to-outbox-within-transactions) & [Iteration 48](../../roadmap.md#iteration-48-implement-mongodb-change-stream-tailer-for-outbox)):** the durable `outbox` collection and its pending-lookup composite index `{ processedAt: 1, _id: 1 }` (name `outbox_processedAt_id`, non-partial, non-unique, **no TTL**) exist (Iteration 46, DDL-only via the `20261114120000-create-outbox-collection` migration); the **atomic write (item 1)** is delivered (Iteration 47) through an Outbox-backed `EventBus` adapter that stages every published event into `outbox` inside the mutation's own transaction, with `processedAt` omitted on insert; the **Change Stream tailer (item 2)** and **fallback catch-up (item 3)** are now delivered (Iteration 48) as a standalone worker that forwards staged events to a technology-agnostic `EventForwarder` seam and persists progress in a singleton `outbox_progress` collection. Only the **confirmation/cleanup routine (item 4)** — which depends on the Kafka broker acknowledgment — remains `[TARGET STATE]`; the actual Kafka hand-off adapter behind the seam is Iteration 49.

To guarantee that "ghost events" are never published to Kafka (e.g., publishing a message for an operation that eventually rolled back or failed in MongoDB), the system enforces the **Transactional Outbox** pattern:

1.  **Atomic Write `[DELIVERED — [Iteration 47](../../roadmap.md#iteration-47-write-domain-events-to-outbox-within-transactions), 2026-11-14]`:** Within a MongoDB multi-document transaction (using `ClientSession`), the application use case persists the target domain aggregate and, in the same transaction, writes an event representation document into the `outbox` collection. Delivered generically behind the `EventBus` port: the `OutboxEventBusAdapter` stages every published event through an `OutboxRepository` (joining the active unit-of-work session) and then dispatches to in-process handlers, so staging is transactional with zero per-use-case wiring. Each record stores the complete `toPrimitives()` payload and omits `processedAt` entirely (never `null`).
    - **ID Architecture & Sequencing `[DELIVERED — [Iteration 47](../../roadmap.md#iteration-47-write-domain-events-to-outbox-within-transactions), 2026-11-14]`:** By enforcing the system-wide generation of **UUIDv7** for all domain events (which embed a 48-bit unix timestamp in their prefix), the domain's native `eventId` inherently provides absolute chronological sequencing and is stored as the outbox record's `_id`. This eliminates the need for database-specific technical fields like MongoDB's `ObjectId` to track insertion order.
2.  **Asynchronous Tailer (Change Streams) & Singleton Worker `[DELIVERED — [Iteration 48](../../roadmap.md#iteration-48-implement-mongodb-change-stream-tailer-for-outbox), 2026-11-14]`:** An independent background worker (`src/apps/outboxWorker/`, a second composition root) tails the `outbox` collection via a **Change Stream listener** (filtering solely on insert operations). It reads committed events in exact replication order — equal to UUIDv7 `_id` order — and forwards each, carrying its full stored representation, to a technology-agnostic `EventForwarder` seam (the Kafka adapter behind the seam is Iteration 49; this iteration's only implementation is a `LoggingEventForwarder` no-op). To prevent massive event duplication during horizontal scaling of the API, the tailer is entirely decoupled from the main HTTP API (Express) and deployed as a standalone **Singleton Worker** (run exactly 1 active replica; the single-active guarantee is operational at deploy time). Progress is persisted after each successful forward in a singleton `outbox_progress` collection as the change-stream **resume token** (seamless restart resume) and the `_id` **high-water mark**; a transient connection drop whose token is still valid reconnects and resumes live without replaying. **Worker liveness `[TARGET STATE — [Iteration 48b](../../roadmap.md#iteration-48b-recover-a-stalled-outbox-worker-via-watchdog-self-exit)]`:** the worker already exits (`process.exit(1)`) on uncaught errors and start failure, which the hosting platform's restart policy recovers; the uncovered gap is an _alive-but-stuck_ worker (silently dead change stream, no forwards progressing, **no crash**). Because the API and worker run as **separate Railway services** and Railway runs **no continuous HTTP liveness probe** (its `healthcheckPath` gates only deploy-time traffic switching, which a request-less worker never uses), the only trigger for restarting a running service is **process exit (code ≠ 0)**. So recovery is handled by an **in-process watchdog** that reads the tailer's liveness state through the existing seam and, when the tailer is stopped or has made no forward progress against pending work within a configured, documented threshold, logs and calls `process.exit(1)` — turning "stuck" into "crash" for the restart policy to recover. The threshold must distinguish a quiet-but-healthy idle worker (no new events to forward) from a genuinely stuck one. A `/health` HTTP endpoint plus external alerting is **observability, not recovery**, and is deferred as optional — it adds no auto-restart on Railway and would require exposing worker networking.
    - **Environment scope per process (decoupled config):** because the worker is a distinct composition root and a separate Railway service, it loads **only the variables its own graph needs** and must never import the API's env schema. Each process validates its own slice at startup: the API validates its full set (`HOST`, `PORT`, OAuth, JWT, mail, cache, Mongo…) via `envs.plugin`; the worker validates **only** `MONGO_*` (through `getMongoEnv`, used by `MongoConfigFactory`) plus `NODE_ENV`/`TEST_LOGS` (through `getLoggerEnv`, used by the logger) and its own `OUTBOX_WORKER_*` tuning vars (defaulted). All three share a single dotenv loader (`shared/infrastructure/config/loadEnvFile`), but their required-variable sets are independent so shared infrastructure (`MongoConfigFactory`, logger) never pulls an app-specific variable such as `HOST`. Consequently the worker service needs `MONGO_*` and `NODE_ENV` provisioned; it must **not** be given — and does not require — `HOST`, OAuth, or JWT variables.
3.  **Fallback Polling Mechanism `[DELIVERED — [Iteration 48](../../roadmap.md#iteration-48-implement-mongodb-change-stream-tailer-for-outbox), 2026-11-14]` (Oplog Rotation Resilience):** If the tailer is offline long enough that the MongoDB oplog rotates, the stored `resume token` is invalidated and reopening the Change Stream throws `ChangeStreamHistoryLost` (code `286`, or `CappedPositionLost` `136`), classified by error code — never message text. On that signal the worker:
    - automatically switches to **fallback catch-up mode**;
    - executes an incremental, index-served query to retrieve the stranded backlog: `db.outbox.find({ _id: { $gt: lastForwardedId } }).sort({ _id: 1 }).hint('outbox_processedAt_id')`, forwarding ascending and advancing the high-water mark per record. _(Note: pending records are identified by the persisted `_id` high-water mark, not by `processedAt: null` — this system never persists `null` (the `outbox` write omits `processedAt`), and the `_id > lastForwardedId` bound also makes catch-up incremental so repeated rotations never rescan from the start. Because `_id` is a UUIDv7, sorting by `_id` guarantees chronological sequencing; the composite `{ processedAt: 1, _id: 1 }` index serves the query with an `IXSCAN` and no in-memory `SORT` stage — verified via `explain`.)_
    - **At-least-once recovery ordering `[DELIVERED — [Iteration 49](../../roadmap.md#iteration-49-route-events-to-kafka-domain-topic-by-partition-key), 2026-11-15]`:** the tailer now opens the fresh live Change Stream from the current database time **before** draining the stranded backlog (establishing the live cursor, then draining `_id > lastForwardedId`, then consuming the live stream). This removes the gap between the catch-up query and the fresh watch, so no event committed during the hand-off is skipped; the overlap re-forwards a bounded set of records, which is acceptable under at-least-once (loss is not). A crash mid-catch-up re-drains the remainder on restart from the persisted high-water mark.
    - **Closed loss window (Iteration 48 → Iteration 49):** before Iteration 49 the live watch was reopened _after_ the backlog drain, skipping events committed in the gap — harmless only while the forwarder was the no-op `LoggingEventForwarder`. With the real Kafka adapter behind the seam, the ordering above closes the window; duplicates from the overlap are absorbed by the Iteration 50 consumer idempotence store.
4.  **Confirmation & Cleanup Routine:** **Confirmation `[DELIVERED — [Iteration 49](../../roadmap.md#iteration-49-route-events-to-kafka-domain-topic-by-partition-key), 2026-11-15]`:** once Kafka durably acknowledges the message (`acks: all`), the tailer marks the event processed by setting `processedAt` to the dispatch `Date` (never `null`, never on publish failure) through a dedicated worker-side `OutboxDispatchRepository` (`updateOne({ _id }, { $set: { processedAt } })`, no unit-of-work session), guaranteeing **at-least-once** delivery; an unacknowledged publish leaves the record pending and eligible for redelivery. **Cleanup `[TARGET STATE — Iterations 50+]`:** to prevent the `outbox` collection from growing infinitely, a fallback cleanup routine MUST be enforced (still deferred):
    - **Fail-Safe Cron Job Sweep (CRITICAL):** Under no circumstances should native age-based MongoDB TTL indexes be used on the raw collection age, as a Kafka or Change Stream outage exceeding the TTL would permanently prune unprocessed events. Instead, a scheduled task (Cron Job / Worker) MUST sweep the collection periodically, executing a safe delete operation strictly constrained to successfully dispatched events: `deleteMany({ processedAt: { $ne: null }, createdAt: { $lt: SEVEN_DAYS_AGO } })`.
    - A secondary alert monitoring rule triggers alerts in Grafana if any un-dispatched event stays in the outbox longer than a critical SLA window (e.g., 1 hour).

---

### 3.2 Dynamic Partitioning & Message Ordering (Dual Design) `[DELIVERED — [Iteration 49](../../roadmap.md#iteration-49-route-events-to-kafka-domain-topic-by-partition-key), 2026-11-15]`

To prevent race conditions across parallel consumers (such as processing a "watering" event before a "transplant" event for the same crop), messages must be processed in strict chronological order. This is guaranteed by dynamic partition routing based on event scope, implemented by the pure application function `derivePartitionKey(record)` (total, deterministic, never throws) with strict precedence `payload.plantInstanceId → payload.bedId → record.aggregateId`:

- **Topic Name:** `agro.domain.events`
- **Dynamic Partition Key Rules (Dual Design):**
  - **Instance-Scoped Events:** If the event targets an individual crop instance, the partition key MUST be **`plantInstanceId` (UUID)**. This forces all events throughout that plant's lifetime (including nurseries and transplants) to fall on the exact same physical partition, ensuring sequential processing and long-term biological traceability.
  - **Bed-Scoped Events:** If the event targets a bed container as a whole (e.g., bed-wide soil fertilization), the partition key MUST be **`bedId` (UUID)**, guaranteeing sequence on soil operations.
  - **Fallback:** when neither scoped id is present on the payload, the key is the event's **`aggregateId`** — a stable per-aggregate identity that still keeps every event of one aggregate on a single partition in UUIDv7 commit order.
- **Chronological Re-ordering / Agronomic Triviality:** Because bed-scoped and instance-scoped events travel through separate partitions, they can arrive slightly out-of-order at the milliseconds level. However, this is agronomically trivial (e.g., processing a bed watering milliseconds before or after an instance pruning does not violate any critical domain invariants). Consumers requiring a unified, combined chronological timeline of both scopes MUST merge the streams and rely on the internal message `occurredAt` timestamp.
- **Handling Out-of-Order Retries (Version/Timestamp Guards):** Because the retry mechanism is non-blocking (failing events are sent to progressive retry topics while the main partition offset is committed and continues processing), newer events might be processed before an older failed event finishes its retries. To prevent old events from overwriting newer state (e.g., a delayed 'watering' event overwriting the reminders of a later 'harvest' event), consumers of state-updating events MUST implement **Version/Timestamp Guards**. The consumer compares the incoming event's `occurredAt` or `id` (UUIDv7) with the timestamp of the last processed event recorded on the target aggregate/read-model; if the incoming event is older than the latest processed state, its state mutation is safely skipped/discarded while still being acknowledged.

---

### 3.3 Strict Consumer Idempotence (Duplicate Protection)

Because the Outbox publisher guarantees _at-least-once_ delivery, network failures or consumer crashes will eventually cause duplicate messages to be processed.

- **Rule:** Every event consumer (e.g., `Reminders Handler`) MUST be strictly idempotent.
- **Mechanism:** Consumers MUST atomically claim the incoming event ID in a uniquely indexed processed-events store and apply the resulting state mutation in the same MongoDB transaction; duplicate-key claims (violating the unique constraint) are treated as already processed, and the transaction is safely committed or ignored without executing side effects twice.
- **Idempotence TTL Rule:** To prevent infinite database bloat, the processed event registry MUST enforce a Time-To-Live (TTL) index or eviction policy. The expiration window (e.g., 7 to 15 days) MUST be strictly greater than or equal to the maximum retention configuration of the source Kafka topic, guaranteeing that replay windows are fully covered without carrying legacy keys forever.

---

### 3.4 Non-Blocking Multi-Topic Consumer Retry Flow `[DELIVERED — [Iteration 51](../../roadmap.md#iteration-51-build-progressive-retry-and-dlq-consumer-flows), 2026-11-17]`

To prevent a transient failure (e.g., MongoDB unreachable or external API timeout) from blocking healthy messages in the same partition (Head-of-Line blocking), a dedicated non-blocking retry flow is established:

```
[ agro.domain.events (Main Topic) ] ── (Failure) ──► [ retry.5s ] ── (Seek / Wait)
                                                        │
                                                     (Failure)
                                                        ▼
[ agro.domain.events.dlq (DLQ) ] ◄─── (Failure) ─── [ retry.30s ]
```

1.  **Main Partition Offset Release:** On failure, the consumer captures the exception and republishes the whole message to `agro.domain.events.retry.5s` (incrementing a retry counter in Kafka headers), **then** releases the main-topic offset only once that publish is acknowledged — never before (FR-008). The consume loop runs `eachBatch` with manual offset resolution so no offset advances until the next destination (retry topic, DLQ, or successful consumption) is durably accepted.
2.  **Progressive Retry Topics:** The system defines specific topics for progressive backoff levels:
    - `agro.domain.events.retry.5s`
    - `agro.domain.events.retry.30s`
    - `agro.domain.events.retry.5m`
3.  **Delay Consumer Scheduling:** Consumers of retry topics inspect the `x-retry-enqueued-at` header and, while the level's progressive delay has not elapsed, **pause that topic-partition, seek back to the message offset, and schedule a timed resume** (never a blocking sleep), ensuring healthy partitions are never blocked. A missing, non-numeric, out-of-range, or `> maxRetries` retry counter is treated as corrupt and routed straight to the DLQ.
4.  **Dead Letter Queue (DLQ):** If a message exhausts the maximum retry budget (default 3), fails with a non-retryable domain-validation error, or carries a corrupt retry counter, it is classified as a "poison pill" and redirected to `agro.domain.events.dlq` with failure metadata in headers (`x-dlq-dead-lettered-at`, final `x-retry-attempt`, `x-retry-failing-consumers`, truncated `x-retry-last-error`). Dead-lettering emits **exactly one** critical structured log carrying the stable marker `event: "domain-event.dead-lettered"` — the signal downstream Grafana alerting keys on. The DLQ is terminal: the worker does not subscribe to it.
    - **Replay Protocol `[TARGET STATE — deferred, out of scope for Iteration 51]`:** To prevent permanent data drift (e.g., a seed inventory deduction that never executed, or a reminder that never cleared), a later iteration MUST add an administrative **Replay Tool** (CLI script or internal admin endpoint) that, once engineers resolve the underlying outage, re-injects the DLQ messages back into the main `agro.domain.events` topic. This iteration only guarantees DLQ contents are safe to replay later (idempotent consumers).
    - **Safety:** Because all consumers are strictly mandated to be idempotent (see Section 3.3), this replay operation is 100% safe and will not cause duplicate state mutations if a consumer partially succeeded before failing.

---

### 3.5 Message Schema Versioning & Registry Strategy

Every message published to the Event Bus is wrapped in a structured envelope to support safe contract evolution:

```json
{
  "id": "string (UUID)",
  "version": "string (e.g., '1.0')",
  "type": "string (Event Type Name)",
  "occurredAt": "string (ISODate)",
  "payload": {
    "//...": "Type-safe, version-specific payload"
  }
}
```

- **Evolution beyond Envelope Versioning:** While the `"version"` field inside the JSON envelope serves as a fast-routing metadata parameter, the production target state mandates the integration of an official **Schema Registry** (e.g., Confluent Schema Registry or Apicurio Registry) enforcing schemas via **JSON Schema**, **Apache Avro**, or **Protocol Buffers**.
- **Compatibility Constraints:** The Schema Registry MUST enforce either `BACKWARD` or `FULL` compatibility rules at the broker level to prevent "poison pill" payloads from crashing downstream consumer systems.

---

### 3.6 BedLayoutSaved Consolidated Event Integration (KonvaJS Side-Effects) `[TARGET STATE (Pending [Iteration 69](../../roadmap.md#iteration-69-publish-bedlayoutsaved-event-to-kafka))]`

To prevent event flooding and redundant processing during rapid UI design changes on the interactive canvas, layout mutations are consolidated into a single atomic transactional commit that publishes exactly one overarching event to Kafka:

- **Event Type:** `BedLayoutSaved`
- **Topic:** `agro.domain.events`
- **Partition Key:** `bedId` (UUID) - Enforces sequential execution of all actions on the same physical bed.
- **Payload Structure:**
  ```json
  {
    "bedId": "string (UUID)",
    "userId": "string (UUID)",
    "activeInstancesCount": "number",
    "savedAt": "string (ISODate)"
  }
  ```
- **Asynchronous Consumer Actions:**
  Upon receiving `BedLayoutSaved`, secondary asynchronous consumers (such as the **Reminders Engine**) trigger background tasks:
  1. Retrieve the newly saved layout for `bedId`.
  2. Clear and dismiss old future reminders for this bed (using reasons like `layout_overwritten`).
  3. Schedule new care calendars and maintenance tasks based on the active species, current season, and companion planting relationships.
     This maintains immediate UI Canvas responsiveness while delegating heavy task-scheduling math completely to the asynchronous Kafka worker tier.
