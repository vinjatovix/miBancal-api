/**
 * Result of a like operation. `item` exposes only the public `plantId` and
 * `likedAt`; the internal `id` and `userId` are never surfaced (FR-012), so the
 * controller returns `item` as-is and stays thin.
 */
export type LikePlantResult = {
  item: {
    plantId: string;
    likedAt: string;
  };
  status: 201 | 200;
};
