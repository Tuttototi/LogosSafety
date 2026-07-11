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
  getFriendlySegnalazioniError,
  useCreateSegnalazione,
  useSegnalazioneDetail,
  useSegnalazioni,
} from "@/modules/segnalazioni/ui";
import { defaultDraft, mockCommunications, roleGroups, roleLabels } from "./mock";
import type { AppTab, DraftReport, SafetyCommunication, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

function normalizeRole(role?: string | null) {
  return role?.trim() || "segnalatore";
}

function getRoleGroup(role: string): SegnalatoreRoleGroup {
  return roleGroups[role] ?? "operational";
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

  const reportsQuery = useSegnalazioni();
  const detailQuery = useSegnalazioneDetail(selectedReportId || undefined);
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
  const isCreateDisabled = createReport.isPending;

  const handleDraftChange = (field: keyof DraftReport) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachments([]);
    setMessage(ATTACHMENTS_DISABLED_MESSAGE);
    event.target.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createReport.isPending) return;

    if (!draft.title.trim() || !draft.description.trim()) {
      setCreateErrorMessage("Compila Titolo e Descrizione.");
      return;
    }

    setCreateErrorMessage("");
    setMessage("");
    createReport.createSegnalazione(draft);
  };

  const handleAction = (action: string, report: SegnalatoreReport) => {
    setSelectedReportId(report.id);
    if (action === "Visualizza") {
      setMessage("");
      return;
    }
    setMessage(`${action} su ${report.code}: azione non ancora collegata al workflow backend.`);
  };

  const handleBackToList = () => {
    setSelectedReportId("");
    setMessage("");
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
    draft,
    emptyListMessage: EMPTY_LIST_MESSAGE,
    isCreateDisabled,
    isDetailLoading: detailQuery.isLoading || detailQuery.isFetching,
    isReportsLoading: reportsQuery.isLoading,
    message,
    roleGroup,
    roleLabel,
    detailErrorMessage,
    listErrorMessage,
    selectedReport,
    visibleReports,
    handleAction,
    handleBackToList,
    handleCommunicationAcknowledgement,
    handleCommunicationOpen,
    handleDraftChange,
    handleFileChange,
    handleSubmit,
    refetchReports: reportsQuery.refetch,
    refetchSelectedReport: detailQuery.refetch,
    setActiveTab,
  };
}
