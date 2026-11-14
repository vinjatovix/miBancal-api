import { isUnresumableChangeStreamError } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/mongoErrorCodes.js';

const mongoError = (props: {
  code?: number;
  codeName?: string;
}): Error & { code?: number; codeName?: string } =>
  Object.assign(new Error('mongo error'), props);

describe('isUnresumableChangeStreamError', () => {
  it('classifies ChangeStreamHistoryLost (286) as unresumable', () => {
    expect(isUnresumableChangeStreamError(mongoError({ code: 286 }))).toBe(
      true
    );
  });

  it('classifies CappedPositionLost (136) as unresumable', () => {
    expect(isUnresumableChangeStreamError(mongoError({ code: 136 }))).toBe(
      true
    );
  });

  it('classifies by codeName when the numeric code is absent', () => {
    expect(
      isUnresumableChangeStreamError(
        mongoError({ codeName: 'ChangeStreamHistoryLost' })
      )
    ).toBe(true);
  });

  it('does not classify a transient/retryable error as unresumable', () => {
    expect(
      isUnresumableChangeStreamError(
        mongoError({ code: 6, codeName: 'HostUnreachable' })
      )
    ).toBe(false);
  });

  it('does not rely on message text', () => {
    expect(
      isUnresumableChangeStreamError(
        new Error('ChangeStreamHistoryLost: oplog rotated')
      )
    ).toBe(false);
  });

  it.each([null, undefined, 'error', 42])(
    'returns false for the non-object value %p',
    (value) => {
      expect(isUnresumableChangeStreamError(value)).toBe(false);
    }
  );
});
