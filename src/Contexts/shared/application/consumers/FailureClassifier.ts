import {
  DomainException,
  DomainServiceUnavailableException
} from '../../domain/errors/index.js';
import type { ConsumerDispatchFailure } from './ConsumerDispatchFailure.js';

export class FailureClassifier {
  public isNonRetryable(error: unknown): boolean {
    return (
      error instanceof DomainException &&
      !(error instanceof DomainServiceUnavailableException)
    );
  }

  public isAggregateNonRetryable(failure: ConsumerDispatchFailure): boolean {
    return (
      failure.failures.length > 0 &&
      failure.failures.every((entry) => this.isNonRetryable(entry.error))
    );
  }
}
