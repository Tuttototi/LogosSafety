import type {
  AvailableOperationalScope,
  CreateSegnalazionePayload,
  DraftReport,
  OperationalScopeLoadState,
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
export const OPERATIONAL_SCOPE_LOADING_MESSAGE = "Caricamento contesti operativi...";
export const OPERATIONAL_SCOPE_EMPTY_MESSAGE = "Nessun appalto o impianto disponibile per il tuo profilo";
export const OPERATIONAL_SCOPE_ERROR_MESSAGE = "Impossibile caricare i contesti operativi. Riprova.";
export const OPERATIONAL_SCOPE_REQUIRED_MESSAGE = "Seleziona un appalto, sede o impianto disponibile.";

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

export function hasAvailableOperationalScope(scope?: AvailableOperationalScope): boolean {
  return Boolean(
    scope &&
    (
      scope.contracts.length > 0 ||
      scope.sites.length > 0 ||
      scope.plants.length > 0 ||
      scope.areas.length > 0
    ),
  );
}

export function getOperationalScopeLoadState(
  isLoading: boolean,
  hasError: boolean,
  scope?: AvailableOperationalScope,
): OperationalScopeLoadState {
  if (isLoading) return "loading";
  if (hasError) return "error";
  return hasAvailableOperationalScope(scope) ? "ready" : "empty";
}

export function getSingleOperationalScopeSelection(
  scope?: AvailableOperationalScope,
): Partial<Pick<DraftReport, "contractId" | "siteId" | "plantId" | "areaId">> {
  if (!scope) return {};

  return {
    contractId: scope.contracts.length === 1 ? scope.contracts[0]?.id : undefined,
    siteId: scope.sites.length === 1 ? scope.sites[0]?.id : undefined,
    plantId: scope.plants.length === 1 ? scope.plants[0]?.id : undefined,
    areaId: scope.areas.length === 1 ? scope.areas[0]?.id : undefined,
  };
}

export function buildOperationalScopePayload(draft: DraftReport): CreateSegnalazionePayload["organizationalScope"] {
  const organizationalScope = Object.fromEntries(
    Object.entries({
      contractId: draft.contractId || undefined,
      siteId: draft.siteId || undefined,
      plantId: draft.plantId || undefined,
      areaId: draft.areaId || undefined,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ) as CreateSegnalazionePayload["organizationalScope"];

  return organizationalScope && Object.values(organizationalScope).some(Boolean)
    ? organizationalScope
    : undefined;
}

export function buildCreateSegnalazionePayload(draft: DraftReport): CreateSegnalazionePayload {
  const organizationalScope = buildOperationalScopePayload(draft);
  const payload: CreateSegnalazionePayload = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priority: draft.priority,
    severity: mapPriorityToSeverity(draft.priority),
    category: DEFAULT_CREATE_CATEGORY,
    type: DEFAULT_CREATE_TYPE,
  };

  if (organizationalScope) {
    payload.organizationalScope = organizationalScope;
  }

  return payload;
}

export function getFriendlySegnalazioniError(fallback: string): string {
  return fallback;
}
