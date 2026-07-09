import type { Allegato } from "./Allegato";
import type { DomainId, ISODateTimeString, StatoComunicazione, TipologiaComunicazione } from "./Enums";

/**
 * Safety communication distributed to one or more users or roles.
 */
export interface Comunicazione {
  id: DomainId;
  titolo: string;
  tipo: TipologiaComunicazione;
  stato: StatoComunicazione;
  descrizione: string;
  contenutoUrl?: string;
  destinatariRuoli?: string[];
  allegati?: Allegato[];
  pubblicataAt: ISODateTimeString;
  scadenzaPresaVisioneAt?: ISODateTimeString;
  creataDaId?: DomainId;
  creataDaNome?: string;
}

/**
 * Local acknowledgement recorded when a user views or acknowledges a communication.
 */
export interface PresaVisioneComunicazione {
  id: DomainId;
  comunicazioneId: DomainId;
  utenteId: DomainId;
  stato: StatoComunicazione;
  vistaAt?: ISODateTimeString;
  presaVisioneAt?: ISODateTimeString;
}

/**
 * Input shape for future creation flows of safety communications.
 */
export interface ComunicazioneInput {
  titolo: string;
  tipo: TipologiaComunicazione;
  descrizione: string;
  contenutoUrl?: string;
  destinatariRuoli?: string[];
  allegati?: Allegato[];
  scadenzaPresaVisioneAt?: ISODateTimeString;
}
