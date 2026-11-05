import type { Response } from 'express';

import {
  formatVersionETag,
  getExpectedVersions,
  ifMatchSchema,
  isFullRepresentation,
  setVersionETag,
  storeExpectedVersions
} from '../../../../src/apps/agroApi/shared/versionTags.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

const buildRes = (locals: Record<string, unknown> = {}) => {
  const set = jest.fn();
  const res = { locals, set } as unknown as Response;

  return { res, set };
};

const tagList = (count: number): string =>
  Array.from({ length: count }, (_, i) => `"${i}"`).join(', ');

describe('versionTags', () => {
  describe('ifMatchSchema', () => {
    it.each([
      ['"3"', [3]],
      ['"0"', [0]],
      [' "3" ', [3]],
      ['"2", "3"', [2, 3]],
      ['"2","3"', [2, 3]],
      ['"2" ,\t"3"', [2, 3]],
      [', "3",', [3]],
      [',,"3",,', [3]],
      ['"9007199254740991"', [Number.MAX_SAFE_INTEGER]],
      ['"0-1"', [0]],
      ['"2-3"', [2]],
      ['"0-0"', [0]],
      ['"0-1", "2-3"', [0, 2]],
      ['"0-03"', []],
      ['"0--1"', []],
      ['W/"0-1"', []],
      ['W/"3"', []],
      ['"abc"', []],
      ['"a,b"', []],
      ['""', []],
      ['"03"', []],
      ['"-1"', []],
      ['"1.5"', []],
      ['"99999999999999999999"', []],
      ['W/"2", "3"', [3]],
      ['"a,b", "4"', [4]],
      [tagList(50), Array.from({ length: 50 }, (_, i) => i)]
    ])('should parse %j into the versions %j', (header, versions) => {
      const result = ifMatchSchema.safeParse(header);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(versions);
    });

    it.each([
      ['3'],
      ['"3'],
      ['3"'],
      ['"3" "4"'],
      ['*, "3"'],
      ['*'],
      ['w/"3"'],
      ['W/3'],
      ['"a"b"'],
      [','],
      [''],
      ['"3";'],
      [tagList(51)]
    ])('should reject %j', (header) => {
      const result = ifMatchSchema.safeParse(header);

      expect(result.success).toBe(false);
    });

    it('should not echo the header in its message', () => {
      const result = ifMatchSchema.safeParse('zz-sentinel');

      expect(result.error?.issues[0]?.message).not.toContain('zz-sentinel');
    });
  });

  describe('formatVersionETag', () => {
    it.each([
      [0, undefined, '"0"'],
      [0, 0, '"0"'],
      [0, 1, '"0-1"'],
      [2, 5, '"2-5"'],
      [4, 0, '"4"']
    ])(
      'formats version %i and counter %p as %s',
      (version, counter, expected) => {
        const tag = formatVersionETag(version, counter);

        expect(tag).toBe(expected);
      }
    );
  });

  describe('setVersionETag', () => {
    it.each([
      [4, undefined, '"4"'],
      [0, 0, '"0"'],
      [0, 1, '"0-1"'],
      [2, 5, '"2-5"']
    ])(
      'should set ETag header for version %i and counter %p to %s',
      (version, counter, expected) => {
        const { res, set } = buildRes();

        setVersionETag(res, version, counter);

        expect(set).toHaveBeenCalledWith('ETag', expected);
      }
    );
  });

  describe('expected versions', () => {
    it.each([[[3]], [[2, 3]], [[]]])(
      'should round-trip %j through res.locals',
      (versions) => {
        const { res } = buildRes();

        storeExpectedVersions(res, versions);

        expect(getExpectedVersions(res)).toEqual(versions);
      }
    );

    it.each([[undefined], [3], [['3']], [[-1]], [[1.5]]])(
      'should fail with an internal error when locals hold %j',
      (value) => {
        const { res } = buildRes({ expectedVersions: value });

        const read = () => getExpectedVersions(res);

        expect(read).toThrow(HttpError);
      }
    );
  });

  describe('isFullRepresentation', () => {
    it('is true without fields or include', () => {
      expect(isFullRepresentation({})).toBe(true);
    });

    it.each([
      ['only id', { fields: [] }],
      ['a fieldset', { fields: ['identity'] }],
      ['include', { include: ['family'] }],
      ['both', { fields: ['identity'], include: ['family'] }]
    ])('is false with %s', (_label, query) => {
      expect(isFullRepresentation(query)).toBe(false);
    });
  });
});
