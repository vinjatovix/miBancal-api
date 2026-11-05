# Module: Location

**Status**: Currently implemented ([Iteration 29](../../roadmap.md#iteration-29-user-locations-aggregate-and-bed-climate-snapshot)).

## 1. PURPOSE

A per-user growing site. A user can own several `Location`s (e.g. a year-round
home garden and a seasonal holiday plot), each carrying its own optional
geographic context. `Location` is the single source of truth for geography:
the `User` aggregate carries none (see auth.md §5).

## 2. AGGREGATE

Collection `locations`, one document per site, owned by exactly one user.

| Field        | Type                    | Required | Notes                                                                                                                                 |
| ------------ | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | UUID                    | yes      | Client-suppliable, like `Bed`.                                                                                                        |
| `userId`     | UUID                    | yes      | Owner, resolved from the session; never from the body.                                                                                |
| `name`       | string                  | yes      | Trimmed, 1–100 chars. Unique among the owner's **active** locations, compared case/accent-insensitively (`es` collation, strength 1). |
| `postalCode` | string                  | no       | Trimmed, 1–20 chars.                                                                                                                  |
| `country`    | string                  | no       | Trimmed, 1–100 chars.                                                                                                                 |
| `timezone`   | string                  | no       | Valid IANA id or `"UTC"`.                                                                                                             |
| `hemisphere` | `'north' \| 'south'`    | no       |                                                                                                                                       |
| `status`     | `'active' \| 'deleted'` | yes      | Soft-delete marker.                                                                                                                   |
| `deletedAt`  | Date                    | no       | Present iff `status === 'deleted'`.                                                                                                   |
| `metadata`   | audit                   | yes      | `createdAt/By`, `updatedAt/By`.                                                                                                       |
| `version`    | number                  | yes      | Optimistic concurrency.                                                                                                               |

Absent optional fields are omitted — never stored as `null`. Soft-deleting
frees the name for reuse (the uniqueness index is partial: `status: 'active'`).

## 3. API CONTRACT

Every route is auth-guarded and owner-scoped; cross-owner access answers
`404` without disclosure.

| Method   | Path                     | Notes                                                                                                                                          |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/locations`      | Duplicate active name → `409`.                                                                                                                 |
| `GET`    | `/api/v1/locations`      | Paginated `{ data, pagination }`; sortable by `name`, `createdAt`.                                                                             |
| `GET`    | `/api/v1/locations/{id}` | Strong ETag.                                                                                                                                   |
| `PATCH`  | `/api/v1/locations/{id}` | JSON Merge Patch; geographic fields `null` unsets, omitted leaves unchanged. Requires `If-Match`. Renaming to a duplicate active name → `409`. |
| `DELETE` | `/api/v1/locations/{id}` | Soft delete (`204`). Requires `If-Match`.                                                                                                      |

## 4. RELATIONSHIPS

- **Location → Bed**: see bed.md §4.3 — `CreateBed`/`UpdateBed` accept an
  optional `locationId` that resolves to an owned active `Location` and
  copies its geography into the bed as a static, immutable snapshot.
  Editing or deleting the source `Location` never changes an existing bed.
- **Location → User**: `userId` only; `User` carries no geography of its own.
