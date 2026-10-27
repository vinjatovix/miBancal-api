# System Context: Agro-Back

This document serves as the absolute technical baseline and source of truth for the **Agro** back-end. It details the actual implemented state of the codebase, maps it directly to the target architecture defined in the refined specification modules (`docs/spec/**`), and provides the gap analysis required to construct the new project roadmap.

---

## 1. Core System Purpose & Vision

**Agro-Back** is an enterprise-grade agricultural and urban garden layout planning engine. It operates as a biological and spatial calculator, going beyond simple CRUD operations to provide ecological intelligence. The system's vision is built on four core pillars:

1.  **Botanical Knowledge Catalog:** A taxonomical and cultural reference library of plants (`plants`) and families (`families`) describing optimal requirements (soil pH, sunlight exposure, root depths, watering) and seasonality calendars.
2.  **Spatial Distribution Validator:** A pure computational geometry engine that evaluates plant placement coordinate-by-coordinate in real-time. It computes spacing constraints and boundary collisions in an advisory, non-blocking manner (generating warnings), except for impossible $0\text{cm}$ physical overlaps which are strictly blocked.
3.  **Standalone Crop Instance Manager:** A temporal tracker of living crops (`plantInstance`) sown in physical spaces, tracking their growth phenology, establishment methods (nurseries vs. direct sowing), and dynamic warning lists.
4.  **Chronological Journal & Suggested Care Engine:** An append-only historical log of cultivation events (watering, pruning, harvests) that passively drives stateful, cached care reminders, dynamically adaptive to local weather forecasts (precipitation rain-silencing).
5.  **Ecological Remedy & Garden Inputs Knowledge Catalog:** A peer-reviewed, empirically verified encyclopedia of natural defenses, fertilizers, biostimulants, and soil amendments (`gardenInputs`), complete with structured multi-step recipes, precise volumetric dosages, safety thresholds, and academic citations (EU Basic Substances, EPA 25(b), university cooperative extensions).

---

## 2. Technical Stack & Boundaries

The technical stack is strictly versioned and configured for high-performance, type-safe operations:

- **Runtime Engine:** Node.js v22.23.2 (running with native ES Modules, `"type": "module"`).
- **Language Specification:** TypeScript v6.0.3 in strict mode (no `any` types allowed).
- **Web Framework:** Express v5.2.1. Rejected promises from async handlers and middlewares reach the global `errorHandler` natively (no `asyncHandler` wrapper). `req.body` is `undefined` when no body parser ran; `validateRequest` reports it as a `body` error (`400`).
- **Dependency Injection (DI):** Awilix v13.0.5 and Awilix-Express v11.0.1 (scoped container-per-request).
- **Database / Persistence:** MongoDB native driver v7.5.0 (binary UUID keys), pinned to `~7.5.0`: from v7.6.0 the driver loads `os` via dynamic `import()`, which fails inside Jest and breaks the connection handshake (upstream bug NODE-7832). Remove the pin once a release ships the fix.
- **Logging & Diagnostics:** Winston v3.19.0.
- **Testing Ecosystem:** Jest v30.5.2 (`ts-jest` v29.4.14), Cucumber v13.2.1 (BDD features), Supertest v7.3.0, `pure-openapi-assert` v2.0.0 (OpenAPI contract assertions; strict OpenAPI 3.0.3 `nullable`, `$ref` siblings ignored). Coverage comes from `jest --coverage` (`coverage/lcov.info`, consumed by SonarCloud). ESM-only dependencies (currently `uuid`) are transpiled for Jest via `transformIgnorePatterns` in `jest.config.ts`.
- **Boundary Security:** Helmet v8.3.0, Cors v2.8.6, Express-Rate-Limit v8.7.0, BcryptJS v3.0.3, Google-Auth-Library v11.1.0, JSONWebToken v9.0.3.
- **Utilities:** `uuid` v14.0.2 (UUIDv7 IDs), `js-yaml` v5.4.2 (OpenAPI spec loading), `dotenv` v18.0.4, `env-var` v7.5.0.

### Tooling Transitions

- **Request Validation:** Every route validates with **Zod** through the shared `validateRequest` step (listings through `listQuerySchema`); `express-validator` was retired in Iteration 14.
- **Database Migrations:** Formally managed and executed via versioned migration scripts under `migrations/scripts/` using `migrate-mongo` on application bootstrap (`server.ts: listen()`). DDL operations guarantee collection creation, schema indexes, and uniqueness constraints (such as `garden_inputs_slug_unique`, `anomalies_slug_unique`, and `users_auth_provider_user_id_unique`) without startup auto-indexing overhead.

---

## 3. Architecture & Clean Boundaries

The codebase adheres strictly to **Clean DDD-Inspired Hexagonal Architecture**, maintaining absolute separation of concerns across layers:

```
[ HTTP REST / Express Controllers ] ──► [ Application Use Cases ] ──► [ Pure Domain Model (Entities, VOs) ]
                 │                                                                     ▲
                 ▼                                                                     │
[ Validation Layer / Zod / OpenAPI ]                                          [ Spatial / Math Services ]
                 │                                                                     ▲
                 ▼                                                                     │
[ Persistence Layer / Mongo Query Translators ] ───────────────────────────────────────┘
```

### Strict Architectural Boundaries

1.  **Pure Domain Core:** The domain layer (`src/Contexts/*/domain`) is stateless, side-effect free, and holds zero technology dependencies. No database models, HTTP error structures, or framework utilities are allowed inside.
2.  **No DTOs in Domain:** Data Transfer Objects only exist at the system boundary (API / Use Case inputs). The domain only receives validated aggregates, entities, and rich Value Objects.
3.  **Audit Metadata Ownership:** Audit fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`) are mutated in memory directly by domain methods prior to persistence, ensuring read-after-write queries (`findById` post-update) can be completely bypassed.
4.  **CQRS Read-Only Bypass:** To maximize system throughput, read-only listings (GET queries) are officially permitted to bypass full rich domain aggregate hydration. Plain MongoDB projections map directly to boundary DTOs, validated by output schemas (Zod/OpenAPI). Current state: the Plants, Families, Anomalies, and GardenInputs `GET` routes read through dedicated read ports and strict output schemas; writes always go through aggregates.
5.  **Repository Retrieval Contract:** Repositories function purely as data retrieval mechanisms. They return nullable values (`null` or `undefined`) when a record is absent and never throw domain-level exceptions (like `DomainNotFoundException`), shifting error enforcement strictly to application use cases.

---

## 4. Modules Gap Analysis (Current vs. Target State)

To drive the new system roadmap, this section contrasts the current state of each module in the codebase against the target state defined in the refined specs.

### A. Beds Module

- **Current State in Code:**
  - Logical container representing physical growing boundaries.
  - Holds static physical dimensions (`width`, `height`, `depth`).
  - **Decoupled Architecture:** Plant instances are completely detached from `Bed.ts` and stored in their dedicated `plant_instances` collection. Bed read endpoints project crop UUID arrays by default, or embed full crop details when `include=plantInstances` is requested.
  - Soft-deletion cascades to all active crops in the bed.
  - **Optimistic Concurrency Control (OCC):** An integer `version` is checked and incremented on every update. Over HTTP the client sends it in `If-Match` (read from `ETag`); an outdated version is rejected with `412` and a missing header with `428`. Adding, moving, or removing crops increments the parent bed version.
  - **Cross-Collection Transactions:** Placing, moving and removing a crop (with the Bed version raise) and deleting a Bed (with its active crops) each run atomically in one MongoDB multi-document transaction, through the driver-free `UnitOfWork` port (delivered in `specs/026-cross-aggregate-transactions`).
- **Target State (Spec v1.4.0):**
  - **Resizing Validation Limits:** Modifying physical bed dimensions is validated against active plant instances. Resizing is strictly blocked (throwing a `DomainConflictException`) if any living crop center coordinate falls outside the proposed boundaries.

### B. PlantInstances Module

- **Current State in Code:**
  - Standalone aggregate root (`PlantInstance`) with its own dedicated MongoDB collection (`plant_instances`) and `PlantInstanceRepository` (delivered in `specs/024-extract-plant-instances`).
  - Full CRUD HTTP API at `/api/v1/plant-instances` supporting placement with spatial collision checks (409 on boundary or spacing collision), partial updates, movement, and soft-deletion (`instanceStatus: 'active' | 'removed'`).
  - Position coordinates are optional to support future nursery establishment.
- **Target State (Spec v1.4.0):**
  - **Nursery Sowing & Seedbed Lifecycle:** Supports direct sowing vs. nursery trays (`establishment: 'direct' | 'nursery'`). Starter tray instances have null coordinates. Sprouting events update the linked `SeedBatch` germination success logs on-the-fly.
  - **Transplant Workflow:** Seedlings are moved to physical beds via a transplant endpoint, triggering on-the-fly spatial/collision validations and recording a `'transplant'` event.

### C. Plants Module

- **Current State in Code:**
  - Catalog of biological species, fully implemented with rich value objects (calendars, sowing traits).
  - Validation: Sowing block (`phenology.sowing`) is optional to support vegetatively propagated crops.
  - Knowledge block holds unstructured arrays of strings and susceptibility links to anomalies (`anomalies: string[]`).
  - Updates use optimistic concurrency control (`version` via `If-Match`; stale version → `412`, missing `If-Match` → `428`).
  - **Favorites & Social Interactions:** Integrated with a private `user_bookmarks` collection (`specs/038`, `039`). Community popular indicators (likes/dislikes) are desensitized and projected as numeric counters on the `Plant` aggregate root (`specs/040`), avoiding write contention and document size bloat.
- **Target State (Spec v1.4.0):**
  - **Structured Propagation:** Propagation methods are defined as detailed sub-objects mapping requirements (best practices, optimal seasons, estimated time weeks) per technique (division, cutting, seed).

### D. Families Module

- **Current State in Code:**
  - Taxonomical classification fully implemented with CRUD, including public listings and custom seeders.
  - Supports polymorphic lookups (by UUID ID or alphanumeric string Slug) on GET routes.
  - Mutation endpoints protected by `isCatalogMaintainer` allowing both `admin` and `collaborator` roles (`specs/036-collaborator-role`).
  - Updates use optimistic concurrency control (`version` via `If-Match`; stale version → `412`, missing `If-Match` → `428`).
- **Target State (Spec v1.4.0):**
  - **Polymorphic Mutation:** `PATCH` already resolves `idOrSlug`; extend it to `DELETE`.

### E. Anomalies Module (Features 041 & 042)

- **Current State in Code:**
  - Standalone aggregate root (`Anomaly`) completely decoupled from plants, stored in dedicated `anomalies` MongoDB collection.
  - Unifies pests, diseases (pathogens), and physiological disorders under a closed category enum (`pest`, `disease`, `physiological_disorder`).
  - Enforces semantic mutation methods (`update`, `delete`, `restore`), slug uniqueness invariants, and in-memory audit metadata.
  - **Diagnostic Guidance:** Carries comprehensive diagnostic sections (`symptoms`, `damage`, `causes`, `affectedCrops`, `prevention`, `treatment`, `naturalEnemies`).
  - **Visual & Differential Encyclopedia:** Rich embedded value objects: `SupportResource` (verified field images, articles, identification videos without mandatory image constraint) and `confusedWith` (declarative one-directional look-alike pointers verified active at write time with graceful dangling degradation).
  - **Canonical Listing & Pagination Contracts:** Public read endpoint at `/api/v1/anomalies` with canonical `listQuerySchema` (`pagination[page]`, `pagination[limit]`), sorting, filtering, and JSON:API sparse fieldset projections.
  - **Polymorphic Lookups:** `GET /api/v1/anomalies/:idOrSlug` with strong ETag generation and 304 Not Modified evaluation.
  - **Curator Write Security:** Write operations guarded by `auth` + `isCatalogMaintainer` (`admin` or `collaborator`) with optimistic concurrency control (`If-Match`).
  - **Plant Linkage:** Plants declare susceptibility via an array of anomaly slugs (`Plant.anomalies = string[]`).

### F. GardenInputs Module (Feature 043, Iteration 40)

- **Current State in Code:**
  - Standalone aggregate root (`GardenInput`) completely decoupled from plants and anomalies, stored in dedicated `gardenInputs` MongoDB collection.
  - Enforces semantic mutation methods (`update`, `delete`, `restore`), slug uniqueness invariants, and in-memory audit metadata.
  - Rich embedded value objects: `Recipe` (ingredients with items/quantities, instructions, brew time, dosage by method, storage conditions, safety notes) and `SupportResource` (verified academic/extension citations).
  - **Scientific & Empirical Baseline:** All catalog entries reflect agronomic literature and university extension standards (demystifying urban gardening myths like raw willow water containing synthetic IBA, or raw cinnamon serving as an auxin-based rooting hormone).
  - **Canonical Listing & Pagination Contracts:** Listing endpoint strictly adheres to `listQuerySchema` with `deepObject` `pagination[page]` (default 1) and `pagination[limit]` (default 25, max 100), accompanied by operator-based filtering (`filter[<field>][eq/in]`) and clean `{ data, pagination }` responses validated via `checkPage`.
  - **Polymorphic Lookups:** `GET /api/v1/garden-inputs/:idOrSlug` with strong ETag generation and 304 Not Modified evaluation.
  - **Curator Write Security:** Write operations guarded by `auth` + `isCatalogMaintainer` (`admin` or `collaborator`) with optimistic concurrency control (`If-Match`).
  - **Zero Seeding via Migrations:** Schema migrations (`20261026120000-create-garden-inputs-collection.js`) are strictly DDL (creating collection and unique/performance indexes). Catalog documents are ingested exclusively via the authenticated HTTP API by curator accounts (`admin` or `collaborator`).

### G. User Bookmarks & Social Interactions (Features 038, 039, 040)

- **Current State in Code:**
  - Standalone `user_bookmarks` collection linking authenticated users to favorite plant varieties.
  - Full CRUD operations via `/api/v1/bookmarks` allowing users to bookmark and unbookmark plants.
  - Public `/api/v1/plants` listing supports filtering bookmarked plants via `filter[bookmarked][eq]=true`.
  - Social popularity indicators: `POST /api/v1/plants/:id/like` and `DELETE /api/v1/plants/:id/like` allow authenticated users to like/unlike varieties, projecting atomic numeric counters on the `Plant` aggregate root.

### H. Authentication & Identity (Auth) (Features 026, 027, 028, 030, 031, 034, 036)

- **Current State in Code:**
  - **Multi-Provider Authentication:** Local email/password credentials, stateless Google Sign-In (`POST /auth/google` with ID token verification), and stateless GitHub OAuth (`POST /auth/github` with PKCE authorization code exchange).
  - **Transactional Email Activation:** New local registrations require email validation via emailed activation tokens (`POST /auth/activate`, `specs/030`).
  - **Password Reset Flow:** Secure email password reset workflow with short-lived tokens (`POST /auth/password/forgot`, `POST /auth/password/reset`, `specs/031`).
  - **Role Management:** Role-based access control with `admin`, `collaborator`, and `user` roles. Administrative role assignment endpoint (`PATCH /api/v1/users/:userId/roles`) with safeguards preventing admin lockout (`specs/034`, `035`).
  - **Client Rate Limiting:** Dedicated rate limiters on sensitive auth endpoints (`registrationLimiter`, `authLimiter`, `passwordResetLimiter`).
- **Target State (Spec v1.4.0):**
  - **Location & Hemisphere Configuration:** User profiles store `postalCode`, `country`, and calculated `hemisphere` (north | south), cached in Redis. Checked dynamically during seasonality validations to prevent JWT payload bloat.

---

## 5. Technical Debt & Refactoring Backlog (Phase 0 Targets)

The immediate focus to stabilize the codebase covers the following refactoring backlog:

1.  **Purify Repository Retrieval Semantics:**
    - _Symptom:_ `MongoCrudRepository` throws `DomainNotFoundException` directly from the infrastructure layer when a document is absent.
    - _Remedy:_ Refactor to return `null` or `undefined`, shifting the exception-throwing logic strictly to application use cases.
2.  **Decouple Mongo Primitives:**
    - _Symptom:_ Database-specific types (like `MetadataPrimitives.ts`) live in infrastructure types folders.
    - _Remedy:_ Relocate database-independent primitives to the shared domain space.
3.  **Transition to Zod Schemas:**
    - _Symptom (resolved in Iterations 9–14):_ Route verification used `express-validator` with manual schemas, leading to potential OpenAPI contract drift.
    - _Remedy:_ Route boundaries now validate with Zod (runtime validation and typed DTOs); auto-generating the Swagger documentation from the schemas is still pending.
4.  **Awilix DI Auto-Wiring:**
    - _Symptom:_ `container.ts` contains verbose, manual registrations of every controller and use case.
    - _Remedy:_ Automate registration through directory scanning with Awilix registration (`asClass`) instead of `container.loadModules` (named exports would need the Awilix `RESOLVER` symbol in application classes).
5.  **Modularize ATDD Step Definitions:**
    - _Symptom:_ Cucumber test steps are concentrated in a few large feature-dump files.
    - _Remedy:_ Split step definitions by bounded context (Plant, Bed, Auth), extracting shared steps into reusable step utilities.

---

## 6. Realized Data Model (MongoDB)

The current MongoDB collection schemas are detailed below, highlighting embedded elements:

### Collection: `users`

- `_id`: Binary (UUID) - Primary Key.
- `email`: String (Unique index).
- `username`: String (Unique index).
- `password`: String (Hashed via bcrypt, null if federated).
- `emailValidated`: Boolean.
- `authMethods`: Array of sub-documents `[{ provider: string, createdAt: date }]`.
- `roles`: Array of Strings (e.g. `['user']`, `['admin']`).
- `metadata`: Audit object (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

### Collection: `beds`

- `_id`: Binary (UUID) - Primary Key.
- `userId`: Binary (UUID) - Foreign Key.
- `name`: String.
- `width`: Number (Positive).
- `height`: Number (Positive).
- `depth`: Number (Positive).
- `version`: Number (OCC).
- `deleted`: Boolean (Logical deletion flag).
- `deletedAt`: ISODate (Optional).
- `metadata`: Audit object.

### Collection: `plant_instances`

- `_id`: Binary (UUID) - Primary Key (UUIDv7).
- `userId`: Binary (UUID) - Foreign Key.
- `bedId`: Binary (UUID) - Foreign Key.
- `plantId`: Binary (UUID) - Foreign Key.
- `position`: Coordinates object `{ x: number, y: number }` (Optional for nursery).
- `growthStatus`: String (Enum: `seed`, `germinated`, `seedling`, `vegetative`, `flowering`, `fruiting`, `harvested`, `dormant`, `dead`).
- `instanceStatus`: String (Enum: `active`, `removed`).
- `plantedAt`: ISODate.
- `removedAt`: ISODate (Optional).
- `variety`: String (Optional).
- `notes`: String (Optional).
- `metadata`: Audit object.

### Collection: `families`

- `_id`: Binary (UUID) - Primary Key.
- `slug`: String (Unique index).
- `name`: String.
- `aliases`: Array of Strings.
- `scientificName`: String.
- `shortDescription`: String.
- `highlights`: Array of Strings.
- `extra`: Dynamic JSON.
- `version`: Number (OCC).
- `metadata`: Audit object.

### Collection: `plants`

- `_id`: Binary (UUID) - Primary Key.
- `identity`: Object `{ name: { primary: string, aliases: string[] }, scientificName: string, family: string (ID) }`.
- `status`: String (Enum: `ACTIVE`, `DELETED`).
- `lifespan`: String.
- `traits`: Object `{ size: { height: range, spread: range }, spacingCm: range }`.
- `calendar`: Object `{ sowing: months, flowering: months, harvest: months }`.
- `propagation`: Object `{ methods: string[] }`.
- `primaryImage`: String (Optional URL).
- `likesCount`: Number (Atomic projected social counter).
- `anomalies`: Array of Strings (Optional anomaly slugs declaring susceptibility).
- `version`: Number (OCC).
- `metadata`: Audit object.

### Collection: `anomalies`

- `_id`: Binary (UUID) - Primary Key (UUIDv7).
- `slug`: String (Unique sparse index `anomalies_slug_unique`).
- `name`: String.
- `scientificName`: String (Optional).
- `category`: String (Index `anomalies_category`; Enum: `pest`, `disease`, `physiological_disorder`).
- `description`: String (Optional).
- `symptoms`: Array of Strings (Optional).
- `damage`: Array of Strings (Optional).
- `causes`: Array of Strings (Optional).
- `affectedCrops`: Array of Strings (Optional).
- `prevention`: Array of Strings (Optional).
- `treatment`: Array of Strings (Optional).
- `naturalEnemies`: Array of Strings (Optional).
- `resources`: Array of sub-documents `[{ type: 'article'|'video'|'image', url: string, title: string, source: string, tags: string[] }]`.
- `confusedWith`: Array of Strings (Optional anomaly slugs).
- `status`: String (Enum: `active`, `deleted`).
- `deletedAt`: ISODate (Optional).
- `version`: Number (Integer >= 0 for OCC).
- `metadata`: Audit object (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

### Collection: `gardenInputs`

- `_id`: Binary (UUID) - Primary Key (UUIDv7).
- `slug`: String (Unique sparse index `garden_inputs_slug_unique`).
- `name`: String.
- `description`: String (Optional).
- `category`: String (Index `garden_inputs_category`; Enum: `defense`, `fertilizer`, `biostimulant`, `soil_amendment`).
- `actions`: Array of Strings (Optional; Enum: `fungicide`, `insecticide`, `repellent`, `nematicide`, `fertilizer`, `biostimulant`, `rooting`, `compost_activator`).
- `activeIngredients`: Array of Strings (Optional).
- `nutrients`: Array of Strings (Optional).
- `targets`: Array of Strings (Optional).
- `recipes`: Array of sub-documents `[{ name, description, ingredients: [{ item, quantity }], instructions: string[], brewTime, dosage: { method, dilution, frequency }, storage: { duration, conditions, spoilageSigns }, safetyNotes: string[] }]`.
- `resources`: Array of sub-documents `[{ type: 'article'|'video'|'image', url: string, title: string, source: string, tags: string[] }]`.
- `status`: String (Enum: `active`, `deleted`).
- `deletedAt`: ISODate (Optional).
- `version`: Number (Integer >= 0 for OCC).
- `metadata`: Audit object (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

### Collection: `user_bookmarks`

- `_id`: Binary (UUID) - Primary Key (UUIDv7).
- `userId`: Binary (UUID) - Foreign Key.
- `plantId`: Binary (UUID) - Foreign Key.
- `bookmarkedAt`: ISODate.

---

## 7. Entry Points & Routing Mechanism

Agro-Back implements an Express HTTP server starting at `src/index.ts`. All endpoints are registered dynamically via a glob scanner:

- **Scanner (`src/apps/agroApi/routes/registerRoutes.ts`):** Scans the route directory at runtime, identifying files matching `**/*.routes.{ts,js}`.
- **Invoker Resolution:** Route modules export an array of **Awilix-Express Invokers** (using `bindRun`) which lazily resolve controllers from the container per request.
- **Structured Exceptions Middleware:** Domain and validation exceptions are intercepted by `errorHandler.ts` and mapped automatically to HTTP codes:
  - `InvalidArgumentException` ──► **400 Bad Request**
  - `DomainUnauthorizedException` ──► **401 Unauthenticated**
  - `DomainForbiddenException` ──► **403 Forbidden**
  - `DomainNotFoundException` ──► **404 Not Found**
  - `DomainConflictException` ──► **409 Conflict**
  - `DomainStaleVersionException` ──► **412 Precondition Failed**

### Detailed Active Routes

1.  **Auth (`/api/v1/auth`):**
    - `POST /register` ──► Registers local credentials (initiates email activation).
    - `POST /login` ──► Standard local login (checks email validation).
    - `POST /google` ──► Verifies Google ID tokens (stateless OAuth).
    - `POST /github` ──► Stateless GitHub OAuth with PKCE authorization code exchange.
    - `POST /activate` ──► Validates email with activation token.
    - `POST /refresh` ──► Renews session token.
    - `POST /password/forgot` ──► Issues password reset token and sends email notice.
    - `POST /password/reset` ──► Resets password with token.
    - `POST /password/change` ──► Updates password for authenticated user.
    - `PATCH /users/:userId/roles` ──► Updates user roles (Admin only, safeguarded).
2.  **Beds (`/api/v1/beds`):**
    - `POST /` ──► Creates a bed.
    - `GET /` ──► Lists beds of the authenticated user.
    - `GET /:id` ──► Retrieves details of a specific bed (optional embed `include=plantInstances`).
    - `PATCH /:id` ──► Partially updates a bed through aggregate mutation methods (`rename`, `resize`).
    - `DELETE /:id` ──► Logically marks a bed as deleted (cascading to plant instances).
3.  **PlantInstances (`/api/v1/plant-instances`):**
    - `POST /` ──► Places a crop in a bed with spatial collision validation.
    - `GET /` ──► Lists plant instances of the authenticated user.
    - `GET /:id` ──► Retrieves a specific crop instance.
    - `PATCH /:id` ──► Updates variety, notes, or coordinates (with collision checks).
    - `DELETE /:id` ──► Soft-deletes a crop instance.
4.  **Families (`/api/v1/families`):**
    - `POST /` ──► Creates a taxonomy (Admin / Collaborator).
    - `GET /` ──► Public paginated listing with sparse fieldsets.
    - `GET /:idOrSlug` ──► Polymorphic lookup by ID or Slug.
    - `PATCH /:idOrSlug` ──► Partially updates a family (Admin / Collaborator).
    - `DELETE /:id` ──► Soft-deletes a family (Admin / Collaborator).
5.  **Plants (`/api/v1/plants`):**
    - `POST /` ──► Creates a plant variety (Admin / Collaborator).
    - `GET /` ──► Public paginated listing with sparse fieldsets and bookmark filtering.
    - `GET /:id` ──► Retrieves a specific variety.
    - `PATCH /:id` ──► Partially updates traits/phenology (Admin / Collaborator).
    - `DELETE /:id` ──► Soft-deletes a variety (Admin / Collaborator).
    - `POST /:id/like` ──► Adds a social like from authenticated user.
    - `DELETE /:id/like` ──► Removes a social like from authenticated user.
6.  **Anomalies (`/api/v1/anomalies`):**
    - `POST /` ──► Creates a plant health anomaly (Admin / Collaborator).
    - `GET /` ──► Public paginated listing with category filtering and sparse fieldsets.
    - `GET /:idOrSlug` ──► Polymorphic lookup by UUID or slug with sparse fieldsets and ETag.
    - `PATCH /:idOrSlug` ──► Partial update guarded by `If-Match` OCC (Admin / Collaborator).
    - `DELETE /:idOrSlug` ──► Soft-deletes an anomaly guarded by `If-Match` OCC (Admin / Collaborator).
7.  **GardenInputs (`/api/v1/garden-inputs`):**
    - `POST /` ──► Creates an organic garden input (Admin / Collaborator).
    - `GET /` ──► Public paginated listing with category/action filtering and sparse fieldsets.
    - `GET /:idOrSlug` ──► Polymorphic lookup by UUID or slug with sparse fieldsets and ETag.
    - `PATCH /:idOrSlug` ──► Partial merge-patch update guarded by `If-Match` OCC (Admin / Collaborator).
    - `DELETE /:idOrSlug` ──► Soft-deletes a garden input guarded by `If-Match` OCC (Admin / Collaborator).
8.  **Bookmarks (`/api/v1/bookmarks`):**
    - `POST /` ──► Bookmarks a plant variety for the authenticated user.
    - `GET /` ──► Lists bookmarked plant IDs for the authenticated user.
    - `DELETE /:plantId` ──► Removes a plant from bookmarks.
9.  **Health (`/api/v1/health`):**
    - `GET /` ──► Returns database and system status.
