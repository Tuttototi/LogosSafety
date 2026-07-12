export class AuditPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = "AuditPersistenceError";
    this.cause = options.cause;
  }
}
