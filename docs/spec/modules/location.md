# Module: Location

**Status**: Currently implemented ([Iteration 29](../../roadmap.md#iteration-29-user-locations-aggregate-and-bed-climate-snapshot) & [Feature 052](../../specs/052-cross-bed-spatial-engine/spec.md)).

## 1. PURPOSE

A per-user growing site. A user can own several `Location`s (e.g. a year-round
home garden and a seasonal holiday plot), each carrying its own optional
geographic context and spatial configuration (orientation and physical canvas dimensions).
`Location` is the single source of truth for geography and spatial layout coordinates:
the `User` aggregate carries none (see auth.md §5).

## 2. AGGREGATE

Collection `locations`, one document per site, owned by exactly one user.

| Field              | Type                                | Required | Notes                                                                                                                                 |
| ------------------ | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | UUID                                | yes      | Client-suppliable, like `Bed`.                                                                                                        |
| `userId`           | UUID                                | yes      | Owner, resolved from the session; never from the body.                                                                                |
| `name`             | string                              | yes      | Trimmed, 1–100 chars. Unique among the owner's **active** locations, compared case/accent-insensitively (`es` collation, strength 1). |
| `postalCode`       | string                              | no       | Trimmed, 1–20 chars.                                                                                                                  |
| `country`          | string                              | no       | Trimmed, 1–100 chars.                                                                                                                 |
| `timezone`         | string                              | no       | Valid IANA id or `"UTC"`.                                                                                                             |
| `hemisphere`       | `'north' \| 'south'`                | no       |                                                                                                                                       |
| `northAngle`       | number (0–359)                      | no       | Geographic orientation: 0° = North along positive Y-axis, measured clockwise in degrees.                                              |
| `canvasDimensions` | `{ width: number, height: number }` | no       | Physical dimensions of the site/parcel in centimeters (positive integers).                                                            |
| `status`           | `'active' \| 'deleted'`             | yes      | Soft-delete marker.                                                                                                                   |
| `deletedAt`        | Date                                | no       | Present iff `status === 'deleted'`.                                                                                                   |
| `metadata`         | audit                               | yes      | `createdAt/By`, `updatedAt/By`.                                                                                                       |
| `version`          | number                              | yes      | Optimistic concurrency.                                                                                                               |

Absent optional fields are omitted — never stored as `null`. Soft-deleting
frees the name for reuse (the uniqueness index is partial: `status: 'active'`).

## 3. API CONTRACT

Every route is auth-guarded and owner-scoped; cross-owner access answers
`404` without disclosure.

| Method   | Path                                 | Notes                                                                                                                                                                         |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/locations`                  | Creates location; accepts name, optional geographic fields, `northAngle`, and `canvasDimensions`. Duplicate active name → `409`.                                              |
| `GET`    | `/api/v1/locations`                  | Paginated `{ data, pagination }`; sortable by `name`, `createdAt`.                                                                                                            |
| `GET`    | `/api/v1/locations/{id}`             | Strong ETag. Returns location details including spatial attributes.                                                                                                           |
| `PATCH`  | `/api/v1/locations/{id}`             | JSON Merge Patch; fields `null` unsets, omitted leaves unchanged. Accepts spatial properties (`northAngle`, `canvasDimensions`). Requires `If-Match`. Duplicate name → `409`. |
| `DELETE` | `/api/v1/locations/{id}`             | Soft delete (`204`). Requires `If-Match`.                                                                                                                                     |
| `GET`    | `/api/v1/locations/{id}/layout`      | Returns site canvas dimensions, placed beds with relative coordinates/rotation, projected plant coordinates, and cross-bed companion relationships. Strong ETag.              |
| `PATCH`  | `/api/v1/locations/{id}/beds-layout` | Batch-updates position `(x, y)` and `rotation` of beds within the location. Validates canvas bounds and detects bed-to-bed collisions via OBB/SAT. Requires `If-Match`.       |

## 4. RELATIONSHIPS

- **Location → Bed**:
  - **Geographic Snapshot**: see bed.md §4.3 — `CreateBed`/`UpdateBed` accept an
    optional `locationId` that resolves to an owned active `Location` and
    copies its geography into the bed as a static, immutable snapshot.
    Editing or deleting the source `Location` never changes an existing bed's geographic snapshot.
  - **Spatial Placement & Layout**: Beds referencing a `locationId` can be positioned
    inside the Location's 2D canvas (`position: { x, y }`, `rotation: 0–359`). The Location
    aggregates placed beds and coordinates validation (preventing overlapping beds and canvas overflow).
- **Location → Plant Relations & Spatial Engine**:
  - The Location serves as the global frame of reference for `SpatialProjectionService` and
    `CrossBedCompanionService`, projecting local crop coordinates into global coordinates and resolving
    companion synergies/antagonisms across neighboring beds.
- **Location → User**: `userId` only; `User` carries no geography or spatial state of its own.
