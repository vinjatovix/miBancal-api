export type ParsedBedIncludes = {
  embedCrops: boolean;
  embedLocation: boolean;
};

export const parseBedIncludes = (include?: string): ParsedBedIncludes => {
  if (!include) {
    return { embedCrops: false, embedLocation: false };
  }
  const parts = new Set(include.split(',').map((s) => s.trim()));
  return {
    embedCrops: parts.has('plantInstances'),
    embedLocation: parts.has('location')
  };
};

export const parseBedLocationFilter = (
  query: Record<string, unknown>
): string | undefined => {
  const filter = query.filter as
    { locationId?: string | { eq?: string } } | undefined;

  if (filter?.locationId) {
    if (typeof filter.locationId === 'string') {
      return filter.locationId;
    }
    if (typeof filter.locationId === 'object' && 'eq' in filter.locationId) {
      return filter.locationId.eq;
    }
  }

  if (typeof query['filter[locationId]'] === 'string') {
    return query['filter[locationId]'];
  }

  if (typeof query['filter[locationId][eq]'] === 'string') {
    return query['filter[locationId][eq]'];
  }

  return undefined;
};
