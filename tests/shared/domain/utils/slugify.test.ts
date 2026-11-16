import { describe, expect, it } from '@jest/globals';

import { slugify } from '../../../../src/shared/domain/utils/slugify.js';

describe('slugify', () => {
  it.each([
    ['Hello World', 'hello-world'],
    ['Tomato & Basil', 'tomato-basil'],
    ['  Solanum lycopersicum  ', 'solanum-lycopersicum'],
    ['Multiple---Hyphens', 'multiple-hyphens'],
    ['---Leading and Trailing---', 'leading-and-trailing'],
    ['Special !@#$%^&*() Characters', 'special-characters'],
    ['Mixed UPPER and lower CASE', 'mixed-upper-and-lower-case']
  ])('converts %p into slug %p', (input, expected) => {
    const slug = slugify(input);

    expect(slug).toBe(expected);
  });

  it.each([
    ['leading hyphens', `${'-'.repeat(10_000)}hello`, 'hello'],
    ['trailing hyphens', `hello${'-'.repeat(10_000)}`, 'hello'],
    [
      'alternating hyphens and whitespace',
      `--- ${'- '.repeat(2_000)} plant ---`,
      'plant'
    ]
  ])(
    'processes pathological input with %s without ReDoS catastrophic backtracking',
    (_caseName, input, expected) => {
      const slug = slugify(input);

      expect(slug).toBe(expected);
    }
  );
});
