export const MONGO_ERROR_CODES = {
  BAD_VALUE: 2,
  WRONG_TYPE: 5,
  NAMESPACE_EXISTS: 48,
  DUPLICATE_INDEX: 65,
  IMMUTABLE_FIELD: 66,
  CANNOT_CREATE_INDEX: 67,
  INDEX_ALREADY_EXISTS: 68,
  INDEX_OPTIONS_CONFLICT: 85,
  INDEX_KEY_SPECS_CONFLICT: 86,
  WRITE_CONFLICT: 112,
  VALIDATION_ERROR: 121,
  CAPPED_POSITION_LOST: 136,
  CHANGE_STREAM_HISTORY_LOST: 286,
  BSON_OBJECT_TOO_LARGE: 10334,
  DUPLICATE_KEY: 11000,
  PATH_COLLISION: 31249
} as const;

const UNRESUMABLE_CHANGE_STREAM_CODES: ReadonlySet<number> = new Set([
  MONGO_ERROR_CODES.CHANGE_STREAM_HISTORY_LOST,
  MONGO_ERROR_CODES.CAPPED_POSITION_LOST
]);

const UNRESUMABLE_CHANGE_STREAM_CODE_NAMES: ReadonlySet<string> = new Set([
  'ChangeStreamHistoryLost',
  'CappedPositionLost'
]);

export const isUnresumableChangeStreamError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; codeName?: unknown };

  if (
    typeof candidate.code === 'number' &&
    UNRESUMABLE_CHANGE_STREAM_CODES.has(candidate.code)
  ) {
    return true;
  }

  return (
    typeof candidate.codeName === 'string' &&
    UNRESUMABLE_CHANGE_STREAM_CODE_NAMES.has(candidate.codeName)
  );
};
