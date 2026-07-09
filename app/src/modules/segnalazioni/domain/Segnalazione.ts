import type { Allegato } from "./Allegato";
import type { Commento } from "./Commento";
import type { DomainId, ISODateTimeString, PrioritaSegnalazione, StatoSegnalazione } from "./Enums";
import type { WorkflowEvento } from "./workflow";

/**
 * Aggregate root for a safety report.
 */
export interface Segnalazione {
  id: DomainId;
  codice: string;
  titolo: string;
  descrizione: string;
  priorita: PrioritaSegnalazione;
  stato: StatoSegnalazione;
  appaltoId?: DomainId;
  appaltoNome?: string;
  commessaId?: DomainId;
  commessaNome?: string;
  sedeId?: DomainId;
  luogo?: string;
  segnalatoreId?: DomainId;
  segnalatoreNome?: string;
  assegnatarioId?: DomainId;
  assegnatarioNome?: string;
  allegati?: Allegato[];
  commenti?: Commento[];
  workflow?: WorkflowEvento[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  presaInCaricoAt?: ISODateTimeString;
  risoltaAt?: ISODateTimeString;
  chiusaAt?: ISODateTimeString;
}

/**
 * Input shape for creating a report before backend persistence exists.
 */
export interface SegnalazioneInput {
  titolo: string;
  descrizione: string;
  priorita: PrioritaSegnalazione;
  appaltoId?: DomainId;
  appaltoNome?: string;
  commessaId?: DomainId;
  commessaNome?: string;
  sedeId?: DomainId;
  luogo?: string;
  allegati?: Allegato[];
}

/**
 * Patch shape for status and assignment changes.
 */
export interface SegnalazioneUpdate {
  titolo?: string;
  descrizione?: string;
  priorita?: PrioritaSegnalazione;
  stato?: StatoSegnalazione;
  assegnatarioId?: DomainId;
  assegnatarioNome?: string;
  luogo?: string;
}
