import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ATTACHMENTS_DISABLED_MESSAGE,
  CREATE_ERROR_MESSAGE,
  CREATE_SUCCESS_MESSAGE,
  DETAIL_ERROR_MESSAGE,
  EMPTY_LIST_MESSAGE,
  LIST_ERROR_MESSAGE,
  OPERATIONAL_SCOPE_EMPTY_MESSAGE,
  OPERATIONAL_SCOPE_ERROR_MESSAGE,
  OPERATIONAL_SCOPE_REQUIRED_MESSAGE,
  WORKFLOW_ACTION_ERROR_MESSAGE,
  getFriendlySegnalazioniError,
  getOperationalScopeLoadState,
  getSingleOperationalScopeSelection,
  hasAvailableOperationalScope,
  useAvailableOperationalScope,
  useCreateSegnalazione,
  useSegnalazioneDetail,
  useSegnalazioneWorkflowActions,
  useSegnalazioni,
} from "@/modules/segnalazioni/ui";
import { defaultDraft, mockCommunications, roleGroups, roleLabels } from "./mock";
import type { AppTab, DraftReport, ReportStatus, SafetyCommunication, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

function normalizeRole(role?: string | null) {
  return role?.trim() || "segnalatore";
}

function getRoleGroup(role: string): SegnalatoreRoleGroup {
  return roleGroups[role] ?? "operational";
}

function applySingleOperationalScopeSelection(
  draft: DraftReport,
  scope: ReturnType<typeof useAvailableOperationalScope>["scope"],
): DraftReport {
  const singleSelection = getSingleOperationalScopeSelection(scope);
  return {
    ...draft,
    contractId: draft.contractId || singleSelection.contractId || "",
    siteId: draft.siteId || singleSelection.siteId || "",
    plantId: draft.plantId || singleSelection.plantId || "",
    areaId: draft.areaId || singleSelection.areaId || "",
  };
}

export function useSegnalatoreApp(role?: string) {
  const { user } = useAuth();
  const currentRole = normalizeRole(role ?? user?.role);
  const roleGroup = getRoleGroup(currentRole);
  const roleLabel = roleLabels[currentRole] ?? roleLabels.segnalatore;

  const [activeTab, setActiveTab] = useState<AppTab>("new");
  const [draft, setDraft] = useState<DraftReport>(defaultDraft);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [communications, setCommunications] = useState<SafetyCommunication[]>(mockCommunications);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [message, setMessage] = useState("");
  const [createErrorMessage, setCreateErrorMessage] = useState("");
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [integrationRequestText, setIntegrationRequestText] = useState("");
  const [integrationText, setIntegrationText] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [closingNote, setClosingNote] = useState("");

  const operationalScopeQuery = useAvailableOperationalScope();
  const reportsQuery = useSegnalazioni();
  const detailQuery = useSegnalazioneDetail(selectedReportId || undefined);
  const workflowActions = useSegnalazioneWorkflowActions();
  const createReport = useCreateSegnalazione({
    onSuccess: (createdId) => {
      setSelectedReportId(createdId);
      setDraft(defaultDraft);
      setAttachments([]);
      setCreateErrorMessage("");
      setActiveTab("reports");
      setMessage(CREATE_SUCCESS_MESSAGE);
    },
  });

  const visibleReports = reportsQuery.reports;

  const selectedReport = detailQuery.report ?? visibleReports.find((report) => report.id === selectedReportId);
  const listErrorMessage = reportsQuery.error ? getFriendlySegnalazioniError(LIST_ERROR_MESSAGE) : "";
  const detailErrorMessage = detailQuery.error ? getFriendlySegnalazioniError(DETAIL_ERROR_MESSAGE) : "";
  const operationalScopeState = getOperationalScopeLoadState(
    operationalScopeQuery.isLoading,
    Boolean(operationalScopeQuery.error),
    operationalScopeQuery.scope,
  );
  const isCreateDisabled = createReport.isPending || operationalScopeState !== "ready";
  const draftWithOperationalDefaults = operationalScopeState === "ready"
    ? applySingleOperationalScopeSelection(draft, operationalScopeQuery.scope)
    : draft;

  const handleDraftChange = (field: keyof DraftReport) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const value = event.target.value;
    setDraft((current) => {
      if (field === "contractId") {
        return { ...current, contractId: value, siteId: "", plantId: "", areaId: "" };
      }
      if (field === "siteId") {
        return { ...current, siteId: value, plantId: "", areaId: "" };
      }
      if (field === "plantId") {
        return { ...current, plantId: value, areaId: "" };
      }
      return { ...current, [field]: value };
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachments([]);
    setMessage(ATTACHMENTS_DISABLED_MESSAGE);
    event.target.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createReport.isPending) return;

    if (operationalScopeState === "loading") {
      setCreateErrorMessage("");
      setMessage("");
      return;
    }

    if (operationalScopeState === "error") {
      setCreateErrorMessage(OPERATIONAL_SCOPE_ERROR_MESSAGE);
      return;
    }

    if (!hasAvailableOperationalScope(operationalScopeQuery.scope)) {
      setCreateErrorMessage(OPERATIONAL_SCOPE_EMPTY_MESSAGE);
      return;
    }

    if (
      !draftWithOperationalDefaults.contractId &&
      !draftWithOperationalDefaults.siteId &&
      !draftWithOperationalDefaults.plantId &&
      !draftWithOperationalDefaults.areaId
    ) {
      setCreateErrorMessage(OPERATIONAL_SCOPE_REQUIRED_MESSAGE);
      return;
    }

    if (!draftWithOperationalDefaults.title.trim() || !draftWithOperationalDefaults.description.trim()) {
      setCreateErrorMessage("Compila Titolo e Descrizione.");
      return;
    }

    setCreateErrorMessage("");
    setMessage("");
    createReport.createSegnalazione(draftWithOperationalDefaults);
  };

  const handleAction = (action: string, report: SegnalatoreReport) => {
    void action;
    setSelectedReportId(report.id);
    setMessage("");
    setWorkflowErrorMessage("");
  };

  const handleBackToList = () => {
    setSelectedReportId("");
    setMessage("");
    setWorkflowErrorMessage("");
  };

  const completeWorkflowAction = (successMessage: string, reset?: () => void) => {
    setWorkflowErrorMessage("");
    setMessage(successMessage);
    reset?.();
  };

  const requireText = (value: string, errorMessage: string): string | undefined => {
    const text = value.trim();
    if (!text) {
      setWorkflowErrorMessage(errorMessage);
      return undefined;
    }
    return text;
  };

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportId || workflowActions.isPending) return;
    const text = requireText(commentText, "Inserisci un commento.");
    if (!text) return;
    workflowActions.addComment({ id: selectedReportId, text }, () =>
      completeWorkflowAction("Commento aggiunto", () => setCommentText("")),
    );
  };

  const handleTakeInCharge = () => {
    if (!selectedReportId || workflowActions.isPending) return;
    workflowActions.takeInCharge({ id: selectedReportId }, () =>
      completeWorkflowAction("Segnalazione presa in carico"),
    );
  };

  const handleRequestIntegration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportId || workflowActions.isPending) return;
    const messageText = requireText(integrationRequestText, "Inserisci il messaggio di richiesta integrazione.");
    if (!messageText) return;
    workflowActions.requestIntegration({ id: selectedReportId, message: messageText }, () =>
      completeWorkflowAction("Richiesta integrazione inviata", () => setIntegrationRequestText("")),
    );
  };

  const handleIntegrate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportId || workflowActions.isPending) return;
    const messageText = requireText(integrationText, "Inserisci il testo dell'integrazione.");
    if (!messageText) return;
    workflowActions.integrate({ id: selectedReportId, message: messageText }, () =>
      completeWorkflowAction("Integrazione inviata", () => setIntegrationText("")),
    );
  };

  const handleChangeStatus = (targetStatus: ReportStatus) => {
    if (!selectedReportId || workflowActions.isPending) return;
    workflowActions.changeStatus({ id: selectedReportId, targetStatus }, () =>
      completeWorkflowAction(`Stato aggiornato a ${targetStatus}`),
    );
  };

  const handleResolve = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportId || workflowActions.isPending) return;
    const note = requireText(resolutionNote, "Inserisci una nota di risoluzione.");
    if (!note) return;
    workflowActions.resolve({ id: selectedReportId, resolutionNote: note }, () =>
      completeWorkflowAction("Segnalazione risolta", () => setResolutionNote("")),
    );
  };

  const handleClose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReportId || workflowActions.isPending) return;
    workflowActions.close({ id: selectedReportId, closingNote: closingNote.trim() || undefined }, () =>
      completeWorkflowAction("Segnalazione chiusa", () => setClosingNote("")),
    );
  };

  const handleAcknowledge = () => {
    if (!selectedReportId || workflowActions.isPending) return;
    workflowActions.acknowledge({ id: selectedReportId }, () =>
      completeWorkflowAction("Presa visione registrata"),
    );
  };

  const handleCommunicationOpen = (communication: SafetyCommunication) => {
    setCommunications((current) =>
      current.map((item) =>
        item.id === communication.id && item.status === "Da vedere"
          ? { ...item, status: "Vista" }
          : item,
      ),
    );
    setMessage(`Apertura ${communication.id}: contenuto mock, nessun download o streaming reale.`);
  };

  const handleCommunicationAcknowledgement = (communication: SafetyCommunication) => {
    setCommunications((current) =>
      current.map((item) =>
        item.id === communication.id
          ? { ...item, status: "Presa visione" }
          : item,
      ),
    );
    setMessage(`Presa visione registrata solo localmente per ${communication.id}.`);
  };

  return {
    activeTab,
    attachments,
    communications,
    createErrorMessage: createErrorMessage || (createReport.error ? getFriendlySegnalazioniError(CREATE_ERROR_MESSAGE) : ""),
    commentText,
    closingNote,
    draft: draftWithOperationalDefaults,
    emptyListMessage: EMPTY_LIST_MESSAGE,
    integrationRequestText,
    integrationText,
    isCreateDisabled,
    isCreatePending: createReport.isPending,
    isDetailLoading: detailQuery.isLoading || detailQuery.isFetching,
    isReportsLoading: reportsQuery.isLoading,
    message,
    operationalScope: operationalScopeQuery.scope,
    operationalScopeErrorMessage: operationalScopeQuery.error ? getFriendlySegnalazioniError(OPERATIONAL_SCOPE_ERROR_MESSAGE) : "",
    operationalScopeState,
    roleGroup,
    roleLabel,
    detailErrorMessage,
    listErrorMessage,
    selectedReport,
    resolutionNote,
    visibleReports,
    workflowErrorMessage: workflowErrorMessage || (workflowActions.error ? getFriendlySegnalazioniError(WORKFLOW_ACTION_ERROR_MESSAGE) : ""),
    isWorkflowActionPending: workflowActions.isPending,
    handleAction,
    handleAcknowledge,
    handleBackToList,
    handleChangeStatus,
    handleCommunicationAcknowledgement,
    handleCommunicationOpen,
    handleClose,
    handleCommentSubmit,
    handleDraftChange,
    handleFileChange,
    handleIntegrate,
    handleRequestIntegration,
    handleResolve,
    handleSubmit,
    handleTakeInCharge,
    refetchReports: reportsQuery.refetch,
    refetchOperationalScope: operationalScopeQuery.refetch,
    refetchSelectedReport: detailQuery.refetch,
    setClosingNote,
    setCommentText,
    setIntegrationRequestText,
    setIntegrationText,
    setResolutionNote,
    setActiveTab,
  };
}
