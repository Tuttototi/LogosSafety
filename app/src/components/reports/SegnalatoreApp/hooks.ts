import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { defaultDraft, mockCommunications, mockReports, roleGroups, roleLabels } from "./mock";
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
  const [reports, setReports] = useState<SegnalatoreReport[]>(mockReports);
  const [communications, setCommunications] = useState<SafetyCommunication[]>(mockCommunications);
  const [selectedCode, setSelectedCode] = useState(mockReports[0]?.code ?? "");
  const [message, setMessage] = useState("");

  const visibleReports = useMemo(
    () => reports.filter((report) => report.visibleTo.includes(roleGroup)),
    [reports, roleGroup],
  );

  const selectedReport = visibleReports.find((report) => report.code === selectedCode) ?? visibleReports[0];

  const handleDraftChange = (field: keyof DraftReport) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileNames = Array.from(event.target.files ?? []).map((file) => file.name);
    if (fileNames.length) {
      setAttachments(fileNames);
      setMessage("Allegati selezionati solo localmente: nessun file e' stato caricato.");
    }
    event.target.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.location.trim() || !draft.title.trim() || !draft.description.trim()) {
      setMessage("Compila Appalto / Commessa / Impianto, Titolo e Descrizione.");
      return;
    }

    const newReport: SegnalatoreReport = {
      code: `SEG-LOCAL-${String(reports.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      status: "Nuova",
      priority: draft.priority,
      date: "Oggi",
      location: draft.location.trim(),
      update: attachments.length
        ? `Bozza locale con ${attachments.length} allegato/i non caricati`
        : "Bozza locale non collegata al backend LogosSafety",
      description: draft.description.trim(),
      visibleTo: ["operational", "manager", "safety"],
    };

    setReports((current) => [newReport, ...current]);
    setSelectedCode(newReport.code);
    setDraft(defaultDraft);
    setAttachments([]);
    setActiveTab("reports");
    setMessage("Segnalazione creata solo localmente: backend LogosSafety non ancora collegato.");
  };

  const handleAction = (action: string, report: SegnalatoreReport) => {
    setSelectedCode(report.code);
    setMessage(`${action} su ${report.code}: azione UI-only, nessuna API chiamata.`);
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
    draft,
    message,
    roleGroup,
    roleLabel,
    selectedReport,
    visibleReports,
    handleAction,
    handleCommunicationAcknowledgement,
    handleCommunicationOpen,
    handleDraftChange,
    handleFileChange,
    handleSubmit,
    setActiveTab,
  };
}
