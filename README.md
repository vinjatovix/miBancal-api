# agro-back [![Version](https://img.shields.io/badge/Version-v1.0.0-blue.svg)](https://semver.org)

## Quality report

[Sonarcloud](https://sonarcloud.io/project/overview?id=vinjatovix_agro-back)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vinjatovix_agro-back&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vinjatovix_agro-back)

## Architecture TL;DR

- Express (layered architecture)
- Domain-driven design (light, bounded contexts)
- Awilix DI container per request scope
- OpenAPI-driven contract validation
- MongoDB persistence layer
- Resilient cache (Redis with in-memory fallback; optional, degrades gracefully)
- Jest + Cucumber testing pyramid (unit / feature / contract)

## Installation

### Prerequisites

- Node.js version = 24.x (>= 24.22.1)
- npm version >= 10.1.0

A `.tool-versions` file is provided to easily work with [asdf](https://asdf-vm.com/)

- Clone the repository:

```bash
git clone https://github.com/vinjatovix/agro-back.git
cd agro-back
```

- Install dependencies:

```bash
npm install
```

### Usage

Please rename `.env_example` to `.env` And fill in the variables.

#### Run in dev mode

Run the development server:

```bash
npm run dev
```

#### Run the build

You can build and run it locally with:

```bash
npm run start:local
```

Or just with:

```bash
npm run docker:local
```

#### Run the outbox worker (event bus)

The HTTP API and the **outbox worker** are two separate processes that share the
same codebase and the same MongoDB. The API, inside each write transaction,
stages domain events into the `outbox` collection; the worker tails that
collection and forwards every staged event downstream. See
[`docs/spec/modules/event-bus.md`](docs/spec/modules/event-bus.md) for the full
design.

Run them in two terminals (Mongo must be up — see _Setup Local Persistence_):

```bash
npm run dev          # terminal A — HTTP API
npm run worker:dev   # terminal B — outbox worker (watch mode, no build needed)
```

The worker reads a **MongoDB change stream**, which only works against a replica
set. The local Mongo from `npm run docker:infra` already runs as replica set
`rs0`, so no extra setup is needed. The worker needs only the `MONGO_*` variables
(it has no HTTP port and does not use Redis); the shared `.env` already covers it.

Trigger an event (e.g. delete a bed) and the worker logs the forwarded event and
persists its progress in the `outbox_progress` collection.

### Setup Local Infrastructure

- Starts local development infrastructure (MongoDB, Kafka broker, Redis, and Kafbat Web UI):

```bash
npm run docker:infra
```

- Stop and tear down infrastructure:

```bash
npm run docker:infra:down
```

- Provisioning the db
  Provisioning the local mongo with cloud `$ENV` data

```bash
npm run restoreDB <env> <database> <user> <password>
```

- Or restore previous dumped data.

```bash
npm run restoreDump $ENV
```

> Note this will only work if previous data for such `$ENV` was dumped and restored before

### Local Kafka & Kafbat Web UI

`npm run docker:infra` launches a single-node Apache Kafka (KRaft) broker (`agro-api-kafka`, port `9092` on host, internal port `29092`) along with a Kafbat Web UI (`agro-api-kafka-ui`) accessible at:

```text
http://localhost:8080
```

Use the dashboard to inspect:

- **Topics**: View topic configurations and messages on `agro.domain.events`.
- **Partitions & Keys**: Inspect dynamic partition keys (e.g. `plantInstanceId`, `bedId`, `aggregateId`) and message offsets.
- **Message Envelopes**: Inspect JSON payloads (`eventId`, `eventName`, `aggregateId`, `occurredAt`, `payload`).
- **Consumer Groups & Lag**: Monitor active consumer groups, partition assignments, and committed offset lag.

#### Port Override (`KAFKA_UI_PORT`)

To run Kafbat UI on a custom host port (e.g. `8085` if port `8080` is in use), set `KAFKA_UI_PORT`:

```bash
KAFKA_UI_PORT=8085 npm run docker:infra
```

### Cache (Redis, optional)

The read-only reference catalogs (plants, families, anomalies, garden inputs) are
served through a resilient cache. **Redis is optional**: with an empty `REDIS_URL`
the app caches in process memory, so dev and tests need no Redis and never fail
when it is absent.

`npm run docker:infra` also starts a local Redis (`agro-api-redis`, port `6379`).
To make the app use it, set in your `.env`:

```bash
REDIS_URL=redis://localhost:6379
```

Then `npm run dev`. Leave `REDIS_URL` empty (or unset) to stay in memory-only mode.
Keep it empty in `.env.test` — the test suite must run without Redis.

Inspect and exercise it:

```bash
docker exec agro-api-redis redis-cli KEYS 'agro:v1:*'   # cached catalog keys
docker stop agro-api-redis                              # degrade: API keeps serving (memory/DB), one warn logged
docker start agro-api-redis                             # recovers automatically, one info logged
```

---

### Testing Strategy

- Unit tests → domain logic (pure)
- Feature tests → HTTP API (controllers + flow)
- Contract tests → OpenAPI schema validation

- Acceptance tests

```bash
npm run test:features
```

- Unit tests

```bash
npm run test:unit        # both groups in parallel, with coverage
npm run test:unit:nodb   # tests that need no database (Mongo can be stopped)
npm run test:unit:db     # *.db.test.ts files, against the Docker MongoDB
npm run test:unit:leaks  # slow diagnostic: shows where a leaked timer/socket was opened
```

> A test file opens a real Mongo connection if and only if it is named `*.db.test.ts`. A file that leaves timers, sockets or servers open fails with a pointer to `npm run test:unit:leaks`. Application logs are silent in tests and log files are never written; run any test command with `TEST_LOGS=1` to print them.

> Repository tests run against the Docker MongoDB. Jest workers run in parallel and each one gets its own database (`test-1`, `test-2`…, see `tests/shared/infrastructure/persistence/mongo/testDBConfig.ts`); `docker/mongo/mongo-init.js` lets the test user write to `test-1`…`test-16`. A container created before this rule needs the grant once:
>
> ```bash
> docker exec agro-api-mongo mongosh -u root -p rootPassword --quiet --eval 'db.getSiblingDB("test").grantRolesToUser("localUser", Array.from({length:16},(_,i)=>({role:"readWrite",db:"test-"+(i+1)})))'
> ```

- Full tests routines

```bash
npm run test
```

## Contributing

Feel free to contribute to this project but keep in mind the guidelines in [CONTRIBUTING.md](CONTRIBUTING.md)

Open an issue or create a [pull request](https://github.com/vinjatovix/agro-back/pulls).

### Bugs and Issues

Please report [bugs](https://github.com/vinjatovix/agro-back/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=), [issues](https://github.com/vinjatovix/agro-back/issues/new?assignees=&labels=&projects=&template=feature_request.md&title=) or [Report a vulnerability](https://github.com/vinjatovix/agro-back/security/advisories/new) at GitHub [Issues](https://github.com/vinjatovix/agro-back/issues).

## License

This project is licensed under the MIT License.

See [LICENSE](LICENSE) for details.

## Changelog

[CHANGELOG](https://github.com/vinjatovix/agro-back/releases)

## Repository

<https://github.com/vinjatovix/agro-back>

### Author

[Vinjatovix](https://github.com/vinjatovix)
