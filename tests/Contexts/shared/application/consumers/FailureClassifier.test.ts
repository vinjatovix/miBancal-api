import {
  ConsumerDispatchFailure,
  FailureClassifier
} from '../../../../../src/Contexts/shared/application/consumers/index.js';
import {
  DomainServiceUnavailableException,
  InvalidArgumentException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('FailureClassifier', () => {
  const classifier = new FailureClassifier();

  it('classifies InvalidArgumentException as non-retryable', () => {
    expect(classifier.isNonRetryable(new InvalidArgumentException('bad'))).toBe(
      true
    );
  });

  it('classifies infrastructure/DB errors as retryable', () => {
    expect(classifier.isNonRetryable(new Error('connection reset'))).toBe(
      false
    );
    expect(
      classifier.isNonRetryable(
        new DomainServiceUnavailableException('mongo down')
      )
    ).toBe(false);
  });

  it('an aggregate where every failure is non-retryable is non-retryable', () => {
    const failure = new ConsumerDispatchFailure([
      { consumer: 'a', error: new InvalidArgumentException('bad') },
      { consumer: 'b', error: new InvalidArgumentException('also bad') }
    ]);

    expect(classifier.isAggregateNonRetryable(failure)).toBe(true);
  });

  it('a mixed aggregate is retryable', () => {
    const failure = new ConsumerDispatchFailure([
      { consumer: 'a', error: new InvalidArgumentException('bad') },
      { consumer: 'b', error: new Error('transient') }
    ]);

    expect(classifier.isAggregateNonRetryable(failure)).toBe(false);
  });
});
