import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  ListFilter,
  MessageSquare,
  Search,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FloatingSmartphone } from "@/components/reports/FloatingSmartphone";
import { SegnalatoreApp } from "@/components/reports/SegnalatoreApp/index";
import {
  ATTACHMENTS_DISABLED_MESSAGE,
  EMPTY_LIST_MESSAGE,
  LIST_ERROR_MESSAGE,
  WORKFLOW_ACTION_ERROR_MESSAGE,
  useAvailableOperationalScope,
  useSegnalazioneDetail,
  useSegnalazioneWorkflowActions,
  useSegnalazioni,
  useSegnalazioniNotifications,
  type OperationalScopeOption,
  type ReportPriority,
  type ReportStatus,
  type SegnalatoreReport,
  type SegnalazioneTimelineItemDto,
  type SegnalazioniListFilters,
} from "@/modules/segnalazioni/ui";

const ALL_STATUSES: ReportStatus[] = [
  "Nuova",
  "Presa in carico",
  "In lavorazione",
  "Richiesta integrazione",
  "Integrata",
  "Risolta",
  "Chiusa",
];

const ALL_PRIORITIES: ReportPriority[] = ["Bassa", "Media", "Alta", "Critica"];

const statusColors: Record<ReportStatus, string> = {
  Nuova: "bg-slate-100 text-slate-700",
  "Presa in carico": "bg-blue-100 text-blue-700",
  "In lavorazione": "bg-amber-100 text-amber-700",
  "Richiesta integrazione": "bg-orange-100 text-orange-700",
  Integrata: "bg-purple-100 text-purple-700",
  Risolta: "bg-emerald-100 text-emerald-700",
  Chiusa: "bg-emerald-100 text-emerald-700",
};

const priorityColors: Record<ReportPriority, string> = {
  Bassa: "bg-emerald-50 text-emerald-700",
  Media: "bg-amber-50 text-amber-700",
  Alta: "bg-orange-50 text-orange-700",
  Critica: "bg-red-50 text-red-700",
};

const timelineLabels: Record<SegnalazioneTimelineItemDto["type"], string> = {
  acknowledged: "Presa visione",
  closed: "Chiusura",
  comment_added: "Commento",
  created: "Creazione",
  integrated: "Integrazione inviata",
  integration_requested: "Integrazione richiesta",
  resolved: "Risoluzione",
  status_changed: "Cambio stato",
  taken_in_charge: "Presa in carico",
};

type ScopeFilters = {
  contractId: string;
  siteId: string;
  plantId: string;
  areaId: string;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionTransitions(report: SegnalatoreReport): ReportStatus[] {
  const coveredStatuses: ReportStatus[] = [
    "Presa in carico",
    "Richiesta integrazione",
    "Integrata",
    "Risolta",
    "Chiusa",
  ];
  return report.capabilities?.allowedStatusTransitions.filter((status) => !coveredStatuses.includes(status)) ?? [];
}

function latestIntegrationRequest(report: SegnalatoreReport): SegnalazioneTimelineItemDto | undefined {
  return [...(report.timeline ?? [])]
    .reverse()
    .find((item) => item.type === "integration_requested");
}

function selectedScope(scopeFilters: ScopeFilters): SegnalazioniListFilters["organizationalScope"] {
  const scope = {
    contractId: scopeFilters.contractId || undefined,
    siteId: scopeFilters.siteId || undefined,
    plantId: scopeFilters.plantId || undefined,
    areaId: scopeFilters.areaId || undefined,
  };
  return Object.values(scope).some(Boolean) ? scope : undefined;
}

function reportMatchesSearch(report: SegnalatoreReport, search: string): boolean {
  if (!search.trim()) return true;
  const haystack = [report.title, report.description, report.code, report.location, report.reporterDisplayName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.trim().toLowerCase());
}

function filterOptionsByParent(
  options: OperationalScopeOption[] | undefined,
  parentKey: "contractId" | "siteId" | "plantId",
  parentValue: string,
): OperationalScopeOption[] {
  if (!options) return [];
  if (!parentValue) return options;
  return options.filter((option) => option[parentKey] === parentValue);
}

function TextActionForm(props: Readonly<{
  buttonLabel: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  value: string;
}>) {
  const { buttonLabel, disabled, onChange, onSubmit, placeholder, value } = props;
  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <textarea
        className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={disabled} className="rounded-full">
        {disabled ? "Operazione in corso..." : buttonLabel}
      </Button>
    </form>
  );
}

export default function Segnalazioni() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ReportPriority>("all");
  const [authorFilter, setAuthorFilter] = useState<"all" | "mine">("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [scopeFilters, setScopeFilters] = useState<ScopeFilters>({
    contractId: "",
    siteId: "",
    plantId: "",
    areaId: "",
  });
  const [selectedReportId, setSelectedReportId] = useState(searchParams.get("report") ?? "");
  const [showPhone, setShowPhone] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [integrationRequestText, setIntegrationRequestText] = useState("");
  const [integrationText, setIntegrationText] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowErrorMessage, setWorkflowErrorMessage] = useState("");

  const operationalScopeQuery = useAvailableOperationalScope();
  const notificationsQuery = useSegnalazioniNotifications();
  const workflowActions = useSegnalazioneWorkflowActions();

  const commonFilters = useMemo<SegnalazioniListFilters>(() => ({
    createdByMe: authorFilter === "mine" ? true : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    organizationalScope: selectedScope(scopeFilters),
  }), [authorFilter, createdFrom, createdTo, scopeFilters]);

  const listFilters = useMemo<SegnalazioniListFilters>(() => ({
    ...commonFilters,
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  }), [commonFilters, priorityFilter, statusFilter]);

  const metricsQuery = useSegnalazioni(commonFilters);
  const reportsQuery = useSegnalazioni(listFilters);
  const filteredReports = useMemo(
    () => reportsQuery.reports.filter((report) => reportMatchesSearch(report, search)),
    [reportsQuery.reports, search],
  );
  const selectedIdForDetail = selectedReportId || filteredReports[0]?.id || reportsQuery.reports[0]?.id;
  const detailQuery = useSegnalazioneDetail(selectedIdForDetail);
  const selectedReport: SegnalatoreReport | undefined = detailQuery.report ?? reportsQuery.reports.find((report) => report.id === selectedIdForDetail);
  const integrationRequest = selectedReport ? latestIntegrationRequest(selectedReport) : undefined;
  const pendingDisabled = workflowActions.isPending;

  const statusCounts = useMemo(() => ALL_STATUSES.reduce<Record<ReportStatus, number>>((accumulator, status) => {
    accumulator[status] = metricsQuery.reports.filter((report) => report.status === status).length;
    return accumulator;
  }, {
    Nuova: 0,
    "Presa in carico": 0,
    "In lavorazione": 0,
    "Richiesta integrazione": 0,
    Integrata: 0,
    Risolta: 0,
    Chiusa: 0,
  }), [metricsQuery.reports]);
  const urgentCount = metricsQuery.reports.filter((report) => report.priority === "Alta" || report.priority === "Critica").length;

  const sites = filterOptionsByParent(operationalScopeQuery.scope?.sites, "contractId", scopeFilters.contractId);
  const plants = filterOptionsByParent(
    filterOptionsByParent(operationalScopeQuery.scope?.plants, "contractId", scopeFilters.contractId),
    "siteId",
    scopeFilters.siteId,
  );
  const areas = filterOptionsByParent(operationalScopeQuery.scope?.areas, "plantId", scopeFilters.plantId);

  const selectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setWorkflowMessage("");
    setWorkflowErrorMessage("");
    setSearchParams(reportId ? { report: reportId } : {});
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAuthorFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setScopeFilters({ contractId: "", siteId: "", plantId: "", areaId: "" });
  };

  const setScopeFilter = (field: keyof ScopeFilters, value: string) => {
    setScopeFilters((current) => {
      if (field === "contractId") return { contractId: value, siteId: "", plantId: "", areaId: "" };
      if (field === "siteId") return { ...current, siteId: value, plantId: "", areaId: "" };
      if (field === "plantId") return { ...current, plantId: value, areaId: "" };
      return { ...current, [field]: value };
    });
  };

  const completeWorkflowAction = (successMessage: string, reset?: () => void) => {
    setWorkflowErrorMessage("");
    setWorkflowMessage(successMessage);
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
    if (!selectedIdForDetail || workflowActions.isPending) return;
    const text = requireText(commentText, "Inserisci un commento.");
    if (!text) return;
    workflowActions.addComment({ id: selectedIdForDetail, text }, () =>
      completeWorkflowAction("Commento aggiunto", () => setCommentText("")),
    );
  };

  const handleTakeInCharge = () => {
    if (!selectedIdForDetail || workflowActions.isPending) return;
    workflowActions.takeInCharge({ id: selectedIdForDetail }, () =>
      completeWorkflowAction("Segnalazione presa in carico"),
    );
  };

  const handleRequestIntegration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIdForDetail || workflowActions.isPending) return;
    const messageText = requireText(integrationRequestText, "Inserisci il messaggio di richiesta integrazione.");
    if (!messageText) return;
    workflowActions.requestIntegration({ id: selectedIdForDetail, message: messageText }, () =>
      completeWorkflowAction("Richiesta integrazione inviata", () => setIntegrationRequestText("")),
    );
  };

  const handleIntegrate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIdForDetail || workflowActions.isPending) return;
    const messageText = requireText(integrationText, "Inserisci il testo dell'integrazione.");
    if (!messageText) return;
    workflowActions.integrate({ id: selectedIdForDetail, message: messageText }, () =>
      completeWorkflowAction("Integrazione inviata", () => setIntegrationText("")),
    );
  };

  const handleChangeStatus = (targetStatus: ReportStatus) => {
    if (!selectedIdForDetail || workflowActions.isPending) return;
    workflowActions.changeStatus({ id: selectedIdForDetail, targetStatus }, () =>
      completeWorkflowAction(`Stato aggiornato a ${targetStatus}`),
    );
  };

  const handleResolve = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIdForDetail || workflowActions.isPending) return;
    const note = requireText(resolutionNote, "Inserisci una nota di risoluzione.");
    if (!note) return;
    workflowActions.resolve({ id: selectedIdForDetail, resolutionNote: note }, () =>
      completeWorkflowAction("Segnalazione risolta", () => setResolutionNote("")),
    );
  };

  const handleClose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIdForDetail || workflowActions.isPending) return;
    workflowActions.close({ id: selectedIdForDetail, closingNote: closingNote.trim() || undefined }, () =>
      completeWorkflowAction("Segnalazione chiusa", () => setClosingNote("")),
    );
  };

  const handleAcknowledge = () => {
    if (!selectedIdForDetail || workflowActions.isPending) return;
    workflowActions.acknowledge({ id: selectedIdForDetail }, () =>
      completeWorkflowAction("Presa visione registrata"),
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-red-100 bg-gradient-to-br from-[#b91c1c] via-[#c2410c] to-[#dc2626] p-6 text-white shadow-[0_20px_60px_rgba(185,28,28,0.2)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100">Modulo segnalazioni</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Gestisci segnalazioni, stati e allegati da un unico centro operativo.</h1>
            <p className="mt-3 text-sm leading-6 text-red-50 sm:text-base">Dashboard operativa con filtri server-side, dettaglio reale, timeline, commenti e workflow protetto dalle capability backend.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="secondary" className="w-full bg-white/15 text-white hover:bg-white/20 sm:w-auto" onClick={() => setShowPhone((current) => !current)}>
              {showPhone ? "Nascondi Smartphone" : "Smartphone"}
            </Button>
            <Button asChild variant="secondary" className="w-full bg-white text-red-700 hover:bg-red-50 sm:w-auto">
              <Link to="/segnalazioni/app">Apri App Segnalatore</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {ALL_STATUSES.map((status) => (
          <Card key={status} className="border-l-[4px] border-l-red-500 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{statusCounts[status]}</p>
                  <p className="mt-1 text-sm text-slate-500">{status}</p>
                </div>
                {status === "Chiusa" || status === "Risolta" ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : status === "Richiesta integrazione" ? (
                  <BadgeCheck className="h-8 w-8 text-blue-500" />
                ) : status === "In lavorazione" ? (
                  <Sparkles className="h-8 w-8 text-amber-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-[4px] border-l-orange-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{urgentCount}</p>
                <p className="mt-1 text-sm text-slate-500">Priorita' alta o critica</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[4px] border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{reportsQuery.total}</p>
                <p className="mt-1 text-sm text-slate-500">Risultati filtro corrente</p>
              </div>
              <ListFilter className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Elenco segnalazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="relative md:col-span-2 xl:col-span-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Cerca per codice, luogo, autore o descrizione" className="h-9 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Stato
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ReportStatus)}>
                    <option value="all">Tutti gli stati</option>
                    {ALL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Priorita'
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | ReportPriority)}>
                    <option value="all">Tutte le priorita'</option>
                    {ALL_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Autore
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value as "all" | "mine")}>
                    <option value="all">Tutti gli autori</option>
                    <option value="mine">Create da me</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Appalto / commessa
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={scopeFilters.contractId} onChange={(event) => setScopeFilter("contractId", event.target.value)}>
                    <option value="">Tutte</option>
                    {(operationalScopeQuery.scope?.contracts ?? []).map((contract) => (
                      <option key={contract.id} value={contract.id}>{contract.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Sede
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={scopeFilters.siteId} onChange={(event) => setScopeFilter("siteId", event.target.value)}>
                    <option value="">Tutte</option>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Impianto
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={scopeFilters.plantId} onChange={(event) => setScopeFilter("plantId", event.target.value)}>
                    <option value="">Tutti</option>
                    {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Area
                  <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none" value={scopeFilters.areaId} onChange={(event) => setScopeFilter("areaId", event.target.value)}>
                    <option value="">Tutte</option>
                    {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Da
                  <Input type="date" className="h-9" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  A
                  <Input type="date" className="h-9" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>Azzera filtri</Button>
                {operationalScopeQuery.isLoading && <span className="text-xs text-slate-500">Caricamento contesti operativi...</span>}
                {operationalScopeQuery.error && <span className="text-xs text-red-600">Contesti operativi non disponibili.</span>}
              </div>

              <div className="space-y-2">
                {reportsQuery.isLoading && (
                  <>
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  </>
                )}

                {!reportsQuery.isLoading && reportsQuery.error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{LIST_ERROR_MESSAGE}</p>
                    <button type="button" className="mt-2 font-semibold underline" onClick={() => reportsQuery.refetch()}>
                      Riprova
                    </button>
                  </div>
                )}

                {!reportsQuery.isLoading && !reportsQuery.error && filteredReports.map((report) => (
                  <button key={report.id} type="button" className={`w-full rounded-2xl border p-4 text-left transition ${selectedReport?.id === report.id ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50"}`} onClick={() => selectReport(report.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{report.code}</p>
                        <p className="text-sm text-slate-600">{report.title}</p>
                      </div>
                      <Badge className={statusColors[report.status]}>{report.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{report.date}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{report.location}</span>
                      {report.reporterDisplayName && <span className="inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{report.reporterDisplayName}</span>}
                      <Badge className={priorityColors[report.priority]}>{report.priority}</Badge>
                    </div>
                  </button>
                ))}
                {!reportsQuery.isLoading && !reportsQuery.error && !filteredReports.length && <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{EMPTY_LIST_MESSAGE}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-base font-semibold text-slate-900">
                <span>Notifiche Segnalazioni</span>
                <Badge className="bg-red-100 text-red-700">{notificationsQuery.unreadCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationsQuery.isLoading && <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />}
              {!notificationsQuery.isLoading && notificationsQuery.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>Impossibile caricare le notifiche.</p>
                  <button type="button" className="mt-2 font-semibold underline" onClick={() => notificationsQuery.refetch()}>
                    Riprova
                  </button>
                </div>
              )}
              {!notificationsQuery.isLoading && !notificationsQuery.error && notificationsQuery.notifications.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Nessuna notifica visibile.</p>
              )}
              {!notificationsQuery.isLoading && !notificationsQuery.error && notificationsQuery.notifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.detailPath}
                  className="block rounded-2xl border border-slate-200 bg-white p-3 text-sm transition hover:border-red-200 hover:bg-red-50"
                  onClick={() => selectReport(notification.reportId)}
                >
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 h-4 w-4 text-red-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(notification.occurredAt)}{notification.actorDisplayName ? ` - ${notification.actorDisplayName}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              <p className="text-xs leading-5 text-slate-500">
                Notifiche derivate dalle timeline visibili. Lo stato letta/non letta non e' ancora persistito.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Dettaglio segnalazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailQuery.isLoading && <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />}
              {!detailQuery.isLoading && detailQuery.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p>Impossibile caricare il dettaglio. Riprova.</p>
                  <button type="button" className="mt-2 font-semibold underline" onClick={() => detailQuery.refetch()}>
                    Riprova
                  </button>
                </div>
              )}
              {!detailQuery.isLoading && !detailQuery.error && selectedReport && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedReport.code}</p>
                      <h2 className="text-lg font-semibold text-slate-900">{selectedReport.title}</h2>
                    </div>
                    <Badge className={statusColors[selectedReport.status]}>{selectedReport.status}</Badge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{selectedReport.description}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categoria</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedReport.category}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Priorita'</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedReport.priority}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Luogo e referente</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedReport.location}{selectedReport.reporterDisplayName ? ` - ${selectedReport.reporterDisplayName}` : ""}
                    </p>
                  </div>

                  {(workflowMessage || workflowErrorMessage || workflowActions.error) && (
                    <div className={`rounded-2xl border p-3 text-sm ${workflowErrorMessage || workflowActions.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      {workflowErrorMessage || (workflowActions.error ? WORKFLOW_ACTION_ERROR_MESSAGE : workflowMessage)}
                    </div>
                  )}

                  {selectedReport.status === "Richiesta integrazione" && integrationRequest?.text && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                      <p className="font-semibold">Integrazione richiesta</p>
                      <p className="mt-1 leading-6">{integrationRequest.text}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">Azioni operative</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.capabilities?.canTakeInCharge && (
                        <Button type="button" size="sm" disabled={pendingDisabled} onClick={handleTakeInCharge}>
                          Prendi in carico
                        </Button>
                      )}
                      {actionTransitions(selectedReport).map((status) => (
                        <Button key={status} type="button" size="sm" variant="outline" disabled={pendingDisabled} onClick={() => handleChangeStatus(status)}>
                          Avanza a {status}
                        </Button>
                      ))}
                      {selectedReport.capabilities?.canAcknowledge && (
                        <Button type="button" size="sm" variant="outline" disabled={pendingDisabled} onClick={handleAcknowledge}>
                          Presa visione
                        </Button>
                      )}
                      {selectedReport.acknowledgement?.acknowledged && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Presa visione registrata
                        </span>
                      )}
                    </div>
                    {selectedReport.capabilities?.canComment && (
                      <TextActionForm
                        buttonLabel="Aggiungi commento"
                        disabled={pendingDisabled}
                        placeholder="Scrivi un commento operativo"
                        value={commentText}
                        onChange={setCommentText}
                        onSubmit={handleCommentSubmit}
                      />
                    )}
                    {selectedReport.capabilities?.canRequestIntegration && (
                      <TextActionForm
                        buttonLabel="Richiedi integrazione"
                        disabled={pendingDisabled}
                        placeholder="Messaggio per il segnalatore"
                        value={integrationRequestText}
                        onChange={setIntegrationRequestText}
                        onSubmit={handleRequestIntegration}
                      />
                    )}
                    {selectedReport.capabilities?.canIntegrate && (
                      <TextActionForm
                        buttonLabel="Invia integrazione"
                        disabled={pendingDisabled}
                        placeholder="Rispondi alla richiesta di integrazione"
                        value={integrationText}
                        onChange={setIntegrationText}
                        onSubmit={handleIntegrate}
                      />
                    )}
                    {selectedReport.capabilities?.canResolve && (
                      <TextActionForm
                        buttonLabel="Risolvi"
                        disabled={pendingDisabled}
                        placeholder="Nota di risoluzione"
                        value={resolutionNote}
                        onChange={setResolutionNote}
                        onSubmit={handleResolve}
                      />
                    )}
                    {selectedReport.capabilities?.canClose && (
                      <TextActionForm
                        buttonLabel="Chiudi"
                        disabled={pendingDisabled}
                        placeholder="Nota di chiusura"
                        value={closingNote}
                        onChange={setClosingNote}
                        onSubmit={handleClose}
                      />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Allegati e foto</p>
                    <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      {ATTACHMENTS_DISABLED_MESSAGE} Serve storage privato con download protetto prima di abilitare upload reali.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      Commenti
                    </div>
                    {(selectedReport.comments ?? []).length === 0 && (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
                        Nessun commento disponibile
                      </p>
                    )}
                    {(selectedReport.comments ?? []).map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm leading-6 text-slate-700">{comment.testo}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {comment.autoreNome ?? "Autore"} - {formatDateTime(comment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Timeline</p>
                    <div className="mt-2 space-y-2">
                      {(selectedReport.timeline ?? []).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-800">{timelineLabels[item.type]}</p>
                            <span className="shrink-0 text-[11px] text-slate-500">{formatDateTime(item.occurredAt)}</span>
                          </div>
                          {(item.previousStatus || item.newStatus) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.previousStatus ? `${item.previousStatus} -> ` : ""}{item.newStatus}
                            </p>
                          )}
                          {item.text && <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>}
                          {(item.actorDisplayName || item.actorRole) && (
                            <p className="mt-2 text-xs text-slate-500">
                              {[item.actorDisplayName, item.actorRole].filter(Boolean).join(" - ")}
                            </p>
                          )}
                        </div>
                      ))}
                      {(selectedReport.timeline ?? []).length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Timeline non disponibile.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
              {!detailQuery.isLoading && !detailQuery.error && !selectedReport && (
                <p className="text-sm text-slate-500">{EMPTY_LIST_MESSAGE}</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">App Segnalatore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-slate-600">
                La creazione segnalazioni e' centralizzata nella App Segnalatore React riusabile.
              </p>
              <Button asChild className="w-full">
                <Link to="/segnalazioni/app">Apri App Segnalatore</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPhone && (
        <FloatingSmartphone onClose={() => setShowPhone(false)}>
          <SegnalatoreApp variant="mobile" />
        </FloatingSmartphone>
      )}
    </div>
  );
}
