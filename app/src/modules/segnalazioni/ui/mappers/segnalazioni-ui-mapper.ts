import type {
  CreateSegnalazionePayload,
  DraftReport,
  ReportPriority,
  SegnalatoreReport,
  SegnalazioneDetailDto,
  SegnalazioniListItemDto,
} from "../types";

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const CREATE_SUCCESS_MESSAGE = "Segnalazione inviata correttamente";
export const CREATE_ERROR_MESSAGE = "Impossibile inviare la segnalazione. Riprova.";
export const LIST_ERROR_MESSAGE = "Impossibile caricare le segnalazioni. Riprova.";
export const DETAIL_ERROR_MESSAGE = "Impossibile caricare il dettaglio. Riprova.";
export const EMPTY_LIST_MESSAGE = "Nessuna segnalazione disponibile";
export const ATTACHMENTS_DISABLED_MESSAGE = "Allegati disponibili in un prossimo aggiornamento.";

export const DEFAULT_CREATE_CATEGORY = "Sicurezza" as const;
export const DEFAULT_CREATE_TYPE = "Pericolo" as const;

export function formatReportDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_FORMATTER.format(date);
}

export function formatOperationalScope(scope: SegnalazioniListItemDto["scope"]): string {
  if (!scope) return "Contesto operativo assegnato";

  const parts = [
    scope.contractId ? `Commessa ${scope.contractId}` : null,
    scope.siteId ? `Sede ${scope.siteId}` : null,
    scope.plantId ? `Impianto ${scope.plantId}` : null,
    scope.areaId ? `Area ${scope.areaId}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : "Contesto operativo assegnato";
}

export function mapListItemToReport(item: SegnalazioniListItemDto): SegnalatoreReport {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    status: item.status,
    priority: item.priority,
    severity: item.severity,
    category: item.category,
    type: item.type,
    date: formatReportDate(item.createdAt),
    location: formatOperationalScope(item.scope),
    update: `Aggiornata il ${formatReportDate(item.updatedAt)}`,
    description: "Apri il dettaglio per visualizzare la descrizione completa.",
    reporterDisplayName: item.reporterDisplayName,
  };
}

export function mapDetailToReport(detail: SegnalazioneDetailDto): SegnalatoreReport {
  return {
    ...mapListItemToReport(detail),
    description: detail.description,
  };
}

export function mapPriorityToSeverity(priority: ReportPriority): ReportPriority {
  return priority;
}

export function buildCreateSegnalazionePayload(draft: DraftReport): CreateSegnalazionePayload {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priority: draft.priority,
    severity: mapPriorityToSeverity(draft.priority),
    category: DEFAULT_CREATE_CATEGORY,
    type: DEFAULT_CREATE_TYPE,
  };
}

export function getFriendlySegnalazioniError(fallback: string): string {
  return fallback;
}
