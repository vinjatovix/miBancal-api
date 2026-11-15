export interface OutboxPendingWorkChecker {
  hasPendingWork(lastForwardedId?: string): Promise<boolean>;
}
