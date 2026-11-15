export interface OutboxTailerStatus {
  readonly running: boolean;
  readonly startedAt?: Date;
  readonly lastForwardedAt?: Date;
  readonly lastForwardedId?: string;
}
