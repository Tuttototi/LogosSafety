import { CheckCircle2, Eye, MessageSquare, ShieldCheck } from "lucide-react";
import { SegnalazioneCard } from "./SegnalazioneCard";
import type { ReportActionHandler, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

type SegnalazioniTabProps = {
  isMobile: boolean;
  isDetailLoading: boolean;
  isReportsLoading: boolean;
  detailErrorMessage: string;
  emptyListMessage: string;
  listErrorMessage: string;
  roleGroup: SegnalatoreRoleGroup;
  roleLabel: string;
  selectedReport?: SegnalatoreReport;
  visibleReports: SegnalatoreReport[];
  onAction: ReportActionHandler;
  onBackToList: () => void;
  onRetryDetail: () => void;
  onRetryList: () => void;
};

export function SegnalazioniTab(props: Readonly<SegnalazioniTabProps>) {
  const {
    detailErrorMessage,
    emptyListMessage,
    isDetailLoading,
    isMobile,
    isReportsLoading,
    listErrorMessage,
    roleGroup,
    roleLabel,
    selectedReport,
    visibleReports,
    onAction,
    onBackToList,
    onRetryDetail,
    onRetryList,
  } = props;

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
              roleGroup={roleGroup}
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4 text-red-600" />
              Dettaglio segnalazione
            </div>
            <button type="button" className="text-xs font-semibold text-red-700 underline" onClick={onBackToList}>
              Torna alla lista
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {selectedReport.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Commenti non ancora collegati
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
              Autorizzata dal backend
            </span>
            {selectedReport.reporterDisplayName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                Segnalatore: {selectedReport.reporterDisplayName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
