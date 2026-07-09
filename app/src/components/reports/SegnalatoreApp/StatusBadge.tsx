import { cn } from "@/lib/utils";
import type { CommunicationStatus, ReportStatus } from "./types";

type Status = ReportStatus | CommunicationStatus;

const statusClasses: Record<Status, string> = {
  Nuova: "bg-slate-100 text-slate-700",
  "In carico": "bg-blue-100 text-blue-700",
  "In attesa integrazione": "bg-amber-100 text-amber-700",
  Chiusa: "bg-emerald-100 text-emerald-700",
  "Da vedere": "bg-red-50 text-red-700",
  Vista: "bg-blue-50 text-blue-700",
  "Presa visione": "bg-emerald-50 text-emerald-700",
};

type StatusBadgeProps = {
  status: Status;
};

export function StatusBadge({ status }: Readonly<StatusBadgeProps>) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", statusClasses[status])}>
      {status}
    </span>
  );
}
