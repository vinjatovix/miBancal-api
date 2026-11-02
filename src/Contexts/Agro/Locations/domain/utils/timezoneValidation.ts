// A canonical IANA identifier is a region path (`Area/Location`, each segment
// capitalized), with `UTC` as the only single-token form we accept. The shape
// check rejects abbreviations (`EST`), offsets (`UTC+2`) and wrong casing
// (`utc`, `europe/madrid`) that `Intl` would otherwise normalize and accept,
// while still admitting zones ICU omits from `supportedValuesOf` because it
// canonicalizes them to a backward-compat link (e.g. `America/Argentina/*`).
const canonicalPathShape = /^[A-Z][A-Za-z0-9+_-]*(?:\/[A-Z][A-Za-z0-9+_-]*)+$/;

export function isValidIanaTimezone(tz: string): boolean {
  if (tz === 'UTC') return true;
  if (!canonicalPathShape.test(tz)) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
