import { useId } from "react";
import { cn } from "@/lib/utils";
import { ComunicazioniTab } from "./ComunicazioniTab";
import { Header } from "./Header";
import { Navigation } from "./Navigation";
import { NuovaSegnalazioneTab } from "./NuovaSegnalazioneTab";
import { SegnalazioniTab } from "./SegnalazioniTab";
import { useSegnalatoreApp } from "./hooks";
import type { SegnalatoreAppProps } from "./types";

export function SegnalatoreApp(props: Readonly<SegnalatoreAppProps>) {
  const { variant = "page", role, className } = props;
  const idPrefix = useId();
  const isMobile = variant === "mobile";
  const state = useSegnalatoreApp(role);

  return (
    <section
      className={cn(
        "bg-white text-slate-900",
        isMobile ? "min-h-full px-4 pb-6 pt-4" : "mx-auto max-w-5xl rounded-2xl border border-slate-200 p-5 shadow-sm",
        className,
      )}
    >
      <Header isMobile={isMobile} roleGroup={state.roleGroup} roleLabel={state.roleLabel} />
      <Navigation activeTab={state.activeTab} onTabChange={state.setActiveTab} />

      {state.message && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.message}
        </p>
      )}

      {state.activeTab === "new" && (
        <NuovaSegnalazioneTab
          attachments={state.attachments}
          draft={state.draft}
          idPrefix={idPrefix}
          isMobile={isMobile}
          onDraftChange={state.handleDraftChange}
          onFileChange={state.handleFileChange}
          onSubmit={state.handleSubmit}
        />
      )}

      {state.activeTab === "reports" && (
        <SegnalazioniTab
          isMobile={isMobile}
          roleGroup={state.roleGroup}
          roleLabel={state.roleLabel}
          selectedReport={state.selectedReport}
          visibleReports={state.visibleReports}
          onAction={state.handleAction}
        />
      )}

      {state.activeTab === "communications" && (
        <ComunicazioniTab
          communications={state.communications}
          onAcknowledge={state.handleCommunicationAcknowledgement}
          onOpen={state.handleCommunicationOpen}
        />
      )}
    </section>
  );
}

export type { SegnalatoreAppProps } from "./types";
