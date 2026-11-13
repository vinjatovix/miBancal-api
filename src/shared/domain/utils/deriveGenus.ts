// A genus: a capitalized alphabetic word, 2–50 letters. This is the same rule
// a plant relation's taxonomic genus scope enforces (`TaxonomicScope.genus`);
// it is duplicated here as a shared botanical rule so the plant catalog and the
// relations context derive a genus identically, without a cross-context import.
const GENUS_PATTERN = /^[A-Z][a-zA-Z]{1,49}$/;

/**
 * The genus a plant belongs to, derived from the first word of its scientific
 * name and normalized to a capitalized first letter with the rest lower-case.
 * Scientific names are stored lower-case, so the normalization is what makes a
 * derived genus match a relation's stored (capitalized) genus value. Returns
 * `undefined` when the first word is not a valid genus (for example a leading
 * hybrid "×"), so callers skip the genus instead of failing.
 */
export const deriveGenus = (
  scientificName: string | undefined
): string | undefined => {
  const firstWord = scientificName?.trim().split(/\s+/)[0];
  if (!firstWord) return undefined;

  const capitalized =
    firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

  return GENUS_PATTERN.test(capitalized) ? capitalized : undefined;
};
