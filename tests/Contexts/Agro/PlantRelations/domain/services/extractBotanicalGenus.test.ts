import { extractBotanicalGenus } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/extractBotanicalGenus.js';

describe('extractBotanicalGenus', () => {
  it.each([
    ['Solanum lycopersicum', 'Solanum'],
    ['Tagetes patula', 'Tagetes'],
    ['Foeniculum vulgare', 'Foeniculum'],
    ['Ocimum basilicum', 'Ocimum'],
    ['solanum lycopersicum', 'Solanum'],
    ['SOLANUM LYCOPERSICUM', 'Solanum']
  ])('extracts genus from standard binomial %s', (input, expected) => {
    const result = extractBotanicalGenus(input);

    expect(result).toBe(expected);
  });

  it.each([
    ['Brassica oleracea var. capitata', 'Brassica'],
    ['Beta vulgaris subsp. vulgaris', 'Beta'],
    ['Capsicum annuum var. annuum', 'Capsicum']
  ])('extracts genus from infraspecific taxa %s', (input, expected) => {
    const result = extractBotanicalGenus(input);

    expect(result).toBe(expected);
  });

  it.each([
    ['× Heucherella tiarelloides', 'Heucherella'],
    ['×Heucherella tiarelloides', 'Heucherella'],
    ['Citrus × sinensis', 'Citrus'],
    ['Fragaria × ananassa', 'Fragaria']
  ])('extracts genus from hybrid name %s', (input, expected) => {
    const result = extractBotanicalGenus(input);

    expect(result).toBe(expected);
  });

  it.each([
    ['"Solanum" lycopersicum', 'Solanum'],
    ['Solanum, lycopersicum', 'Solanum'],
    ['Solanum.', 'Solanum'],
    ['Solanum', 'Solanum']
  ])(
    'strips punctuation and extracts genus from single-word or punctuated names %s',
    (input, expected) => {
      const result = extractBotanicalGenus(input);

      expect(result).toBe(expected);
    }
  );

  it.each([
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
    ['12345', null],
    ['x', null],
    ['?', null],
    ['A', null]
  ])(
    'returns null for empty, whitespace, or invalid input %s',
    (input, expected) => {
      const result = extractBotanicalGenus(input);

      expect(result).toBe(expected);
    }
  );
});
