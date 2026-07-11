import type { FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { SegnalazioneCard } from "./SegnalazioneCard";
import type {
  ReportActionHandler,
  ReportStatus,
  SegnalatoreReport,
  SegnalatoreRoleGroup,
  SegnalazioneTimelineItemDto,
} from "./types";

type SegnalazioniTabProps = {
  closingNote: string;
  commentText: string;
  detailErrorMessage: string;
  emptyListMessage: string;
  integrationRequestText: string;
  integrationText: string;
  isDetailLoading: boolean;
  isMobile: boolean;
  isReportsLoading: boolean;
  isWorkflowActionPending: boolean;
  listErrorMessage: string;
  resolutionNote: string;
  roleGroup: SegnalatoreRoleGroup;
  roleLabel: string;
  selectedReport?: SegnalatoreReport;
  visibleReports: SegnalatoreReport[];
  workflowErrorMessage: string;
  onAction: ReportActionHandler;
  onAcknowledge: () => void;
  onBackToList: () => void;
  onChangeStatus: (targetStatus: ReportStatus) => void;
  onClose: (event: FormEvent<HTMLFormElement>) => void;
  onClosingNoteChange: (value: string) => void;
  onCommentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCommentTextChange: (value: string) => void;
  onIntegrate: (event: FormEvent<HTMLFormElement>) => void;
  onIntegrationRequestTextChange: (value: string) => void;
  onIntegrationTextChange: (value: string) => void;
  onRequestIntegration: (event: FormEvent<HTMLFormElement>) => void;
  onResolve: (event: FormEvent<HTMLFormElement>) => void;
  onResolutionNoteChange: (value: string) => void;
  onRetryDetail: () => void;
  onRetryList: () => void;
  onTakeInCharge: () => void;
};

const timelineLabels: Record<SegnalazioneTimelineItemDto["type"], string> = {
  acknowledged: "Presa visione",
  closed: "Chiusura",
  comment_added: "Commento",
  created: "Creazione",
  integrated: "Integrazione inviata",
  integration_requested: "Integrazione richiesta",
  resolved: "Risoluzione",
  status_changed: "Cambio stato",
  taken_in_charge: "Presa in carico",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionTransitions(report: SegnalatoreReport): ReportStatus[] {
  const coveredStatuses: ReportStatus[] = [
    "Presa in carico",
    "Richiesta integrazione",
    "Integrata",
    "Risolta",
    "Chiusa",
  ];
  return report.capabilities?.allowedStatusTransitions.filter((status) => !coveredStatuses.includes(status)) ?? [];
}

function latestIntegrationRequest(report: SegnalatoreReport): SegnalazioneTimelineItemDto | undefined {
  return [...(report.timeline ?? [])]
    .reverse()
    .find((item) => item.type === "integration_requested");
}

function TextActionForm(props: Readonly<{
  buttonLabel: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  value: string;
}>) {
  const { buttonLabel, disabled, onChange, onSubmit, placeholder, value } = props;
  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <textarea
        className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {disabled ? "Operazione in corso..." : buttonLabel}
      </button>
    </form>
  );
}

export function SegnalazioniTab(props: Readonly<SegnalazioniTabProps>) {
  const {
    closingNote,
    commentText,
    detailErrorMessage,
    emptyListMessage,
    integrationRequestText,
    integrationText,
    isDetailLoading,
    isMobile,
    isReportsLoading,
    isWorkflowActionPending,
    listErrorMessage,
    resolutionNote,
    roleLabel,
    selectedReport,
    visibleReports,
    workflowErrorMessage,
    onAction,
    onAcknowledge,
    onBackToList,
    onChangeStatus,
    onClose,
    onClosingNoteChange,
    onCommentSubmit,
    onCommentTextChange,
    onIntegrate,
    onIntegrationRequestTextChange,
    onIntegrationTextChange,
    onRequestIntegration,
    onResolve,
    onResolutionNoteChange,
    onRetryDetail,
    onRetryList,
    onTakeInCharge,
  } = props;
  const capabilities = selectedReport?.capabilities;
  const pendingDisabled = isWorkflowActionPending;
  const integrationRequest = selectedReport ? latestIntegrationRequest(selectedReport) : undefined;

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{isMobile ? "Le tue segnalazioni" : "Segnalazioni visibili"}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {visibleReports.length}
        </span>
      </div>

      <div className="space-y-3">
        {isReportsLoading && (
          <>
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          </>
        )}

        {!isReportsLoading && listErrorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{listErrorMessage}</p>
            <button type="button" className="mt-2 font-semibold underline" onClick={onRetryList}>
              Riprova
            </button>
          </div>
        )}

        {!isReportsLoading && !listErrorMessage && visibleReports.map((report) => (
          <SegnalazioneCard
            key={report.id}
            isSelected={selectedReport?.id === report.id}
            report={report}
            onAction={onAction}
          />
        ))}

        {!isReportsLoading && !listErrorMessage && visibleReports.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {emptyListMessage}
          </p>
        )}
      </div>

      {isDetailLoading && (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      )}

      {!isDetailLoading && detailErrorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{detailErrorMessage}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetryDetail}>
            Riprova
          </button>
        </div>
      )}

      {selectedReport && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4 text-red-600" />
              Dettaglio segnalazione
            </div>
            <button type="button" className="text-xs font-semibold text-red-700 underline" onClick={onBackToList}>
              Torna alla lista
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedReport.code}</p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">{selectedReport.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {selectedReport.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
              {selectedReport.location}
            </span>
            {selectedReport.reporterDisplayName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                {selectedReport.reporterDisplayName}
              </span>
            )}
          </div>

          {workflowErrorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {workflowErrorMessage}
            </p>
          )}

          {selectedReport.status === "Richiesta integrazione" && integrationRequest?.text && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              <p className="font-semibold">Integrazione richiesta</p>
              <p className="mt-1 leading-6">{integrationRequest.text}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Azioni</p>
            <div className="flex flex-wrap gap-2">
              {capabilities?.canTakeInCharge && (
                <button
                  type="button"
                  disabled={pendingDisabled}
                  className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={onTakeInCharge}
                >
                  Prendi in carico
                </button>
              )}
              {actionTransitions(selectedReport).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pendingDisabled}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  onClick={() => onChangeStatus(status)}
                >
                  Avanza a {status}
                </button>
              ))}
              {capabilities?.canAcknowledge && (
                <button
                  type="button"
                  disabled={pendingDisabled}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  onClick={onAcknowledge}
                >
                  Presa visione
                </button>
              )}
              {selectedReport.acknowledgement?.acknowledged && (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Presa visione registrata
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {capabilities?.canComment && (
              <TextActionForm
                buttonLabel="Aggiungi commento"
                disabled={pendingDisabled}
                placeholder="Scrivi un commento operativo"
                value={commentText}
                onChange={onCommentTextChange}
                onSubmit={onCommentSubmit}
              />
            )}
            {capabilities?.canRequestIntegration && (
              <TextActionForm
                buttonLabel="Richiedi integrazione"
                disabled={pendingDisabled}
                placeholder="Messaggio per il segnalatore"
                value={integrationRequestText}
                onChange={onIntegrationRequestTextChange}
                onSubmit={onRequestIntegration}
              />
            )}
            {capabilities?.canIntegrate && (
              <TextActionForm
                buttonLabel="Invia integrazione"
                disabled={pendingDisabled}
                placeholder="Rispondi alla richiesta di integrazione"
                value={integrationText}
                onChange={onIntegrationTextChange}
                onSubmit={onIntegrate}
              />
            )}
            {capabilities?.canResolve && (
              <TextActionForm
                buttonLabel="Risolvi"
                disabled={pendingDisabled}
                placeholder="Nota di risoluzione"
                value={resolutionNote}
                onChange={onResolutionNoteChange}
                onSubmit={onResolve}
              />
            )}
            {capabilities?.canClose && (
              <TextActionForm
                buttonLabel="Chiudi"
                disabled={pendingDisabled}
                placeholder="Nota di chiusura"
                value={closingNote}
                onChange={onClosingNoteChange}
                onSubmit={onClose}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Commenti
            </div>
            {(selectedReport.comments ?? []).length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
                Nessun commento disponibile
              </p>
            )}
            {(selectedReport.comments ?? []).map((comment) => (
              <div key={comment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm leading-6 text-slate-700">{comment.testo}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {comment.autoreNome ?? "Autore"} - {formatDateTime(comment.createdAt)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Timeline</p>
            <div className="space-y-2">
              {(selectedReport.timeline ?? []).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{timelineLabels[item.type]}</p>
                    <span className="shrink-0 text-[11px] text-slate-500">{formatDateTime(item.occurredAt)}</span>
                  </div>
                  {(item.previousStatus || item.newStatus) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.previousStatus ? `${item.previousStatus} -> ` : ""}{item.newStatus}
                    </p>
                  )}
                  {item.text && <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>}
                  {(item.actorDisplayName || item.actorRole) && (
                    <p className="mt-2 text-xs text-slate-500">
                      {[item.actorDisplayName, item.actorRole].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
