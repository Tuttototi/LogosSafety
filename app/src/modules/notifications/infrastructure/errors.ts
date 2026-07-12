export class NotificationOutboxPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = "NotificationOutboxPersistenceError";
    this.cause = options.cause;
  }
}
