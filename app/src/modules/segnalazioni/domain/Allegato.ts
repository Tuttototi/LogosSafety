import type { DomainId, ISODateTimeString, TipoAllegato } from "./Enums";

/**
 * File metadata associated with a report, comment or communication.
 * The model stores metadata only; file storage, upload and download are infrastructure concerns.
 */
export interface Allegato {
  id: DomainId;
  nomeFile: string;
  mimeType: string;
  dimensioneByte: number;
  tipo: TipoAllegato;
  descrizione?: string;
  checksum?: string;
  segnalazioneId?: DomainId;
  commentoId?: DomainId;
  comunicazioneId?: DomainId;
  caricatoDaId?: DomainId;
  caricatoDaNome?: string;
  caricatoAt: ISODateTimeString;
}

/**
 * Minimal data required to register attachment metadata before infrastructure storage is connected.
 */
export interface AllegatoInput {
  nomeFile: string;
  mimeType: string;
  dimensioneByte: number;
  tipo: TipoAllegato;
  descrizione?: string;
}
