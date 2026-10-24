/** The optional guidance fields shared by every anomaly representation. */
export type GuidanceFields = {
  scientificName?: string;
  description?: string;
  symptoms?: string[];
  damage?: string[];
  causes?: string[];
  affectedCrops?: string[];
  prevention?: string[];
  treatment?: string[];
  naturalEnemies?: string[];
};

/**
 * A source of guidance fields. Each may be absent or carry an explicit
 * `undefined` (the aggregate's getters), so every representation — the
 * aggregate, DTOs, primitives and Mongo documents — is an accepted source.
 */
export type GuidanceSource = {
  scientificName?: string | undefined;
  description?: string | undefined;
  symptoms?: string[] | undefined;
  damage?: string[] | undefined;
  causes?: string[] | undefined;
  affectedCrops?: string[] | undefined;
  prevention?: string[] | undefined;
  treatment?: string[] | undefined;
  naturalEnemies?: string[] | undefined;
};

const OPTIONAL_GUIDANCE_KEYS = [
  'scientificName',
  'description',
  'symptoms',
  'damage',
  'causes',
  'affectedCrops',
  'prevention',
  'treatment',
  'naturalEnemies'
] as const satisfies ReadonlyArray<keyof GuidanceFields>;

/**
 * The optional guidance fields present on `source`, each omitted when absent.
 * Shared by the domain, input and persistence mappers so none repeats the
 * per-field copy (and none trips the cyclomatic-complexity budget).
 */
export const definedGuidance = (source: GuidanceSource): GuidanceFields => {
  const guidance: Record<string, unknown> = {};

  for (const key of OPTIONAL_GUIDANCE_KEYS) {
    const value = source[key];
    if (value !== undefined) guidance[key] = value;
  }

  return guidance;
};
