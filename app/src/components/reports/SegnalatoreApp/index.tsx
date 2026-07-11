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
          errorMessage={state.createErrorMessage}
          idPrefix={idPrefix}
          isMobile={isMobile}
          isSubmitDisabled={state.isCreateDisabled}
          isSubmitting={state.isCreatePending}
          operationalScope={state.operationalScope}
          operationalScopeErrorMessage={state.operationalScopeErrorMessage}
          operationalScopeState={state.operationalScopeState}
          onDraftChange={state.handleDraftChange}
          onFileChange={state.handleFileChange}
          onRetryOperationalScope={state.refetchOperationalScope}
          onSubmit={state.handleSubmit}
        />
      )}

      {state.activeTab === "reports" && (
        <SegnalazioniTab
          closingNote={state.closingNote}
          commentText={state.commentText}
          isMobile={isMobile}
          roleGroup={state.roleGroup}
          roleLabel={state.roleLabel}
          detailErrorMessage={state.detailErrorMessage}
          emptyListMessage={state.emptyListMessage}
          integrationRequestText={state.integrationRequestText}
          integrationText={state.integrationText}
          isDetailLoading={state.isDetailLoading}
          isReportsLoading={state.isReportsLoading}
          isWorkflowActionPending={state.isWorkflowActionPending}
          listErrorMessage={state.listErrorMessage}
          resolutionNote={state.resolutionNote}
          selectedReport={state.selectedReport}
          visibleReports={state.visibleReports}
          workflowErrorMessage={state.workflowErrorMessage}
          onAction={state.handleAction}
          onAcknowledge={state.handleAcknowledge}
          onBackToList={state.handleBackToList}
          onChangeStatus={state.handleChangeStatus}
          onClose={state.handleClose}
          onClosingNoteChange={state.setClosingNote}
          onCommentSubmit={state.handleCommentSubmit}
          onCommentTextChange={state.setCommentText}
          onIntegrate={state.handleIntegrate}
          onIntegrationRequestTextChange={state.setIntegrationRequestText}
          onIntegrationTextChange={state.setIntegrationText}
          onRequestIntegration={state.handleRequestIntegration}
          onResolve={state.handleResolve}
          onResolutionNoteChange={state.setResolutionNote}
          onRetryDetail={state.refetchSelectedReport}
          onRetryList={state.refetchReports}
          onTakeInCharge={state.handleTakeInCharge}
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
