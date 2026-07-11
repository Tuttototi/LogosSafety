import { cn } from "@/lib/utils";
import type { ReportPriority } from "./types";

const priorityClasses: Record<ReportPriority, string> = {
  Bassa: "bg-emerald-50 text-emerald-700",
  Media: "bg-amber-50 text-amber-700",
  Alta: "bg-red-50 text-red-700",
  Critica: "bg-red-100 text-red-800",
};

type PriorityBadgeProps = {
  priority: ReportPriority;
};

export function PriorityBadge({ priority }: Readonly<PriorityBadgeProps>) {
  return (
    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", priorityClasses[priority])}>
      {priority}
    </span>
  );
}
