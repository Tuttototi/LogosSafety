import { cn } from "@/lib/utils";
import type { AppTab } from "./types";

type NavigationProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: "new", label: "Nuova" },
  { id: "reports", label: "Segnalazioni" },
  { id: "communications", label: "Comunicazioni" },
];

export function Navigation({ activeTab, onTabChange }: Readonly<NavigationProps>) {
  return (
    <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn("rounded-lg px-3 py-2 transition", activeTab === tab.id ? "bg-white text-red-700 shadow-sm" : "text-slate-600")}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
