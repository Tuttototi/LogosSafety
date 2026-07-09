import { Clock3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionsByGroup } from "./mock";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import type { ReportActionHandler, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

type SegnalazioneCardProps = {
  isSelected: boolean;
  report: SegnalatoreReport;
  roleGroup: SegnalatoreRoleGroup;
  onAction: ReportActionHandler;
};

export function SegnalazioneCard({ isSelected, report, roleGroup, onAction }: Readonly<SegnalazioneCardProps>) {
  return (
    <article className={cn("rounded-xl border p-3 transition", isSelected ? "border-red-200 bg-red-50" : "border-slate-200 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{report.code}</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">{report.title}</h2>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {report.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {report.date} - {report.update}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={report.priority} />
        {actionsByGroup[roleGroup].map((action) => (
          <button
            key={`${report.code}-${action}`}
            type="button"
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
            onClick={() => onAction(action, report)}
          >
            {action}
          </button>
        ))}
      </div>
    </article>
  );
}
