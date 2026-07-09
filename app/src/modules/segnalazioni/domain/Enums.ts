/**
 * Stable entity identifier used by the Segnalazioni domain.
 * It is intentionally transport-neutral and can map to UUIDs, numeric ids or external codes.
 */
export type DomainId = string;

/**
 * ISO 8601 date-time string.
 * Keeping dates as strings makes the domain model safe across frontend, API and storage layers.
 */
export type ISODateTimeString = string;

/**
 * Business priority assigned to a safety report.
 */
export const PrioritaSegnalazione = {
  Bassa: "Bassa",
  Media: "Media",
  Alta: "Alta",
  Critica: "Critica",
} as const;

export type PrioritaSegnalazione = (typeof PrioritaSegnalazione)[keyof typeof PrioritaSegnalazione];

/**
 * Lifecycle status of a safety report.
 */
export const StatoSegnalazione = {
  Nuova: "Nuova",
  PresaInCarico: "Presa in carico",
  InLavorazione: "In lavorazione",
  RichiestaIntegrazione: "Richiesta integrazione",
  Integrata: "Integrata",
  Risolta: "Risolta",
  Chiusa: "Chiusa",
} as const;

export type StatoSegnalazione = (typeof StatoSegnalazione)[keyof typeof StatoSegnalazione];

/**
 * Type of safety communication distributed to users.
 */
export const TipologiaComunicazione = {
  Video: "Video",
  Circolare: "Circolare",
  Infografica: "Infografica",
  Avviso: "Avviso",
} as const;

export type TipologiaComunicazione = (typeof TipologiaComunicazione)[keyof typeof TipologiaComunicazione];

/**
 * Local acknowledgement status for a safety communication.
 */
export const StatoComunicazione = {
  DaVedere: "Da vedere",
  Vista: "Vista",
  PresaVisione: "Presa visione",
} as const;

export type StatoComunicazione = (typeof StatoComunicazione)[keyof typeof StatoComunicazione];

/**
 * Generic attachment classification.
 */
export const TipoAllegato = {
  Foto: "Foto",
  Documento: "Documento",
  Altro: "Altro",
} as const;

export type TipoAllegato = (typeof TipoAllegato)[keyof typeof TipoAllegato];

export const PRIORITA_SEGNALAZIONE_VALUES = Object.values(PrioritaSegnalazione);
export const STATO_SEGNALAZIONE_VALUES = Object.values(StatoSegnalazione);
export const TIPOLOGIA_COMUNICAZIONE_VALUES = Object.values(TipologiaComunicazione);
