import { StatoSegnalazione } from "./Enums";
import type { DomainId, ISODateTimeString } from "./Enums";

/**
 * State transition recorded in the report lifecycle.
 */
export interface WorkflowEvento {
  id: DomainId;
  segnalazioneId: DomainId;
  statoDa?: StatoSegnalazione;
  statoA: StatoSegnalazione;
  eseguitoDaId?: DomainId;
  eseguitoDaNome?: string;
  note?: string;
  createdAt: ISODateTimeString;
}

/**
 * Allowed transition rule for a report status.
 */
export interface WorkflowRegola {
  statoDa: StatoSegnalazione;
  statiAmmessi: StatoSegnalazione[];
  richiedeCommento?: boolean;
  richiedeAllegato?: boolean;
}

/**
 * Official linear status flow for the Segnalazioni module.
 */
export const SEGNALAZIONE_WORKFLOW_STATES = [
  StatoSegnalazione.Nuova,
  StatoSegnalazione.PresaInCarico,
  StatoSegnalazione.InLavorazione,
  StatoSegnalazione.RichiestaIntegrazione,
  StatoSegnalazione.Integrata,
  StatoSegnalazione.Risolta,
  StatoSegnalazione.Chiusa,
] as const;

/**
 * Official transition rules for the Segnalazioni lifecycle.
 */
export const SEGNALAZIONE_WORKFLOW: WorkflowRegola[] = [
  {
    statoDa: StatoSegnalazione.Nuova,
    statiAmmessi: [StatoSegnalazione.PresaInCarico],
  },
  {
    statoDa: StatoSegnalazione.PresaInCarico,
    statiAmmessi: [StatoSegnalazione.InLavorazione],
  },
  {
    statoDa: StatoSegnalazione.InLavorazione,
    statiAmmessi: [StatoSegnalazione.RichiestaIntegrazione],
  },
  {
    statoDa: StatoSegnalazione.RichiestaIntegrazione,
    statiAmmessi: [StatoSegnalazione.Integrata],
    richiedeCommento: true,
  },
  {
    statoDa: StatoSegnalazione.Integrata,
    statiAmmessi: [StatoSegnalazione.Risolta],
  },
  {
    statoDa: StatoSegnalazione.Risolta,
    statiAmmessi: [StatoSegnalazione.Chiusa],
  },
  {
    statoDa: StatoSegnalazione.Chiusa,
    statiAmmessi: [],
  },
];

/**
 * Backward-compatible alias for consumers that need the default workflow definition.
 */
export const DEFAULT_SEGNALAZIONE_WORKFLOW = SEGNALAZIONE_WORKFLOW;

/**
 * Returns the statuses reachable from the provided status.
 */
export function getAllowedTransitions(stato: StatoSegnalazione): StatoSegnalazione[] {
  return SEGNALAZIONE_WORKFLOW.find((regola) => regola.statoDa === stato)?.statiAmmessi ?? [];
}

/**
 * Checks whether a status transition is allowed by the official workflow.
 */
export function canTransition(statoDa: StatoSegnalazione, statoA: StatoSegnalazione): boolean {
  return getAllowedTransitions(statoDa).includes(statoA);
}

/**
 * A report is closed only when it reaches the final status.
 */
export function isClosed(stato: StatoSegnalazione): boolean {
  return stato === StatoSegnalazione.Chiusa;
}

/**
 * Every status before the final closed state is considered open.
 */
export function isOpen(stato: StatoSegnalazione): boolean {
  return !isClosed(stato);
}

/**
 * Domain-level editability follows the open/closed lifecycle.
 * Permission checks remain outside this pure domain model.
 */
export function isEditable(stato: StatoSegnalazione): boolean {
  return isOpen(stato);
}
