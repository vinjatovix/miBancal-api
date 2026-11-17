export type ConsumerFailure = {
  consumer: string;
  error: unknown;
};

export class ConsumerDispatchFailure extends Error {
  public readonly failures: readonly ConsumerFailure[];

  constructor(failures: readonly ConsumerFailure[]) {
    super(
      `One or more domain event consumers failed: ${failures
        .map((failure) => failure.consumer)
        .join(', ')}`
    );
    this.name = 'ConsumerDispatchFailure';
    this.failures = failures;
    Error.captureStackTrace?.(this, new.target);
  }

  public failingConsumers(): string[] {
    return this.failures.map((failure) => failure.consumer);
  }
}
