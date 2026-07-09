import type { Allegato } from "./Allegato";
import type { DomainId, ISODateTimeString } from "./Enums";

/**
 * Comment added to a safety report timeline.
 */
export interface Commento {
  id: DomainId;
  segnalazioneId: DomainId;
  testo: string;
  autoreId?: DomainId;
  autoreNome?: string;
  pubblico: boolean;
  allegati?: Allegato[];
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

/**
 * Data required to create a local or API-bound report comment.
 */
export interface CommentoInput {
  segnalazioneId: DomainId;
  testo: string;
  pubblico?: boolean;
  allegati?: Allegato[];
}

