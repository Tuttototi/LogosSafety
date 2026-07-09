import { CheckCircle2, Eye, MessageSquare, ShieldCheck } from "lucide-react";
import { SegnalazioneCard } from "./SegnalazioneCard";
import type { ReportActionHandler, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

type SegnalazioniTabProps = {
  isMobile: boolean;
  roleGroup: SegnalatoreRoleGroup;
  roleLabel: string;
  selectedReport?: SegnalatoreReport;
  visibleReports: SegnalatoreReport[];
  onAction: ReportActionHandler;
};

export function SegnalazioniTab(props: Readonly<SegnalazioniTabProps>) {
  const { isMobile, roleGroup, roleLabel, selectedReport, visibleReports, onAction } = props;

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
        {visibleReports.map((report) => (
          <SegnalazioneCard
            key={report.code}
            isSelected={selectedReport?.code === report.code}
            report={report}
            roleGroup={roleGroup}
            onAction={onAction}
          />
        ))}
      </div>

      {selectedReport && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Eye className="h-4 w-4 text-red-600" />
            Dettaglio minimo
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {selectedReport.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Commenti UI-only
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
              RBAC server-side futuro
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
