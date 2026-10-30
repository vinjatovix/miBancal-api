export const extractBotanicalGenus = (
  scientificName?: string | null
): string | null => {
  if (!scientificName || typeof scientificName !== 'string') {
    return null;
  }

  const cleaned = scientificName.trim().replace(/^[×xX]\s*/, '');
  if (!cleaned) {
    return null;
  }

  const firstToken = cleaned.split(/\s+/)[0];
  if (!firstToken) {
    return null;
  }

  const lettersOnly = firstToken.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length < 2) {
    return null;
  }

  const normalized =
    lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase();

  return normalized;
};
