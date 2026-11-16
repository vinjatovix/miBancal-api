import { isValidIanaTimezone } from '../../../../../../src/Contexts/Agro/Locations/domain/utils/timezoneValidation.js';

describe('isValidIanaTimezone', () => {
  describe('positive cases', () => {
    it.each([
      ['UTC'],
      ['Europe/Madrid'],
      ['America/Argentina/Buenos_Aires'],
      ['Asia/Tokyo'],
      ['Australia/Sydney'],
      ['Africa/Cairo']
    ])(
      'should return true for valid IANA timezone "%s"',
      (timezone: string) => {
        expect(isValidIanaTimezone(timezone)).toBe(true);
      }
    );
  });

  describe('negative cases', () => {
    it.each([
      [''],
      ['   '],
      ['Invalid/Timezone'],
      ['Europe/Mars'],
      ['GMT+1'],
      ['UTC+2'],
      ['utc'],
      ['europe/madrid'],
      ['EST']
    ])(
      'should return false for invalid IANA timezone "%s"',
      (timezone: string) => {
        expect(isValidIanaTimezone(timezone)).toBe(false);
      }
    );
  });
});
