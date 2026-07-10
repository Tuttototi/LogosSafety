import type { AuditPort } from "./ports/AuditPort";
import type { ClockPort } from "./ports/ClockPort";
import type { IdGeneratorPort } from "./ports/IdGeneratorPort";
import type { NotificationPort } from "./ports/NotificationPort";
import type { SegnalazioniRepository } from "./ports/SegnalazioniRepository";

export interface SegnalazioniUseCaseDependencies {
  repository: SegnalazioniRepository;
  audit: AuditPort;
  notification: NotificationPort;
  clock: ClockPort;
  ids: IdGeneratorPort;
}

