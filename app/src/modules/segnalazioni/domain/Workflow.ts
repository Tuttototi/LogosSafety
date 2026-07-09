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
 * Default status flow for the first implementation of Segnalazioni.
 */
export const DEFAULT_SEGNALAZIONE_WORKFLOW: WorkflowRegola[] = [
  {
    statoDa: StatoSegnalazione.Nuova,
    statiAmmessi: [StatoSegnalazione.PresaInCarico, StatoSegnalazione.Chiusa],
  },
  {
    statoDa: StatoSegnalazione.PresaInCarico,
    statiAmmessi: [StatoSegnalazione.InLavorazione, StatoSegnalazione.RichiestaIntegrazione],
  },
  {
    statoDa: StatoSegnalazione.InLavorazione,
    statiAmmessi: [StatoSegnalazione.RichiestaIntegrazione, StatoSegnalazione.Risolta],
  },
  {
    statoDa: StatoSegnalazione.RichiestaIntegrazione,
    statiAmmessi: [StatoSegnalazione.Integrata],
    richiedeCommento: true,
  },
  {
    statoDa: StatoSegnalazione.Integrata,
    statiAmmessi: [StatoSegnalazione.InLavorazione, StatoSegnalazione.Risolta],
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

