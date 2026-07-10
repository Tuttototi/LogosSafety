export class SegnalazioniPersistenceError extends Error {
  readonly causeDetails?: Record<string, unknown>;

  constructor(
    message: string,
    causeDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SegnalazioniPersistenceError";
    this.causeDetails = causeDetails;
  }
}
