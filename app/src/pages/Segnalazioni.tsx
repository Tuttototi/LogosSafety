import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, BadgeCheck, CalendarDays, CheckCircle2, FileText, ListFilter, Search, Sparkles } from "lucide-react";
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
  useSegnalazioneDetail,
  useSegnalazioni,
  type ReportPriority,
  type ReportStatus,
  type SegnalatoreReport,
} from "@/modules/segnalazioni/ui";

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

export default function Segnalazioni() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ReportPriority>("all");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const reportsQuery = useSegnalazioni();
  const selectedFromList = reportsQuery.reports.find((report) => report.id === selectedReportId) ?? reportsQuery.reports[0];
  const detailQuery = useSegnalazioneDetail(selectedFromList?.id);
  const selectedReport: SegnalatoreReport | undefined = detailQuery.report ?? selectedFromList;
  const reports = reportsQuery.reports;

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = !search || [report.title, report.description, report.code, report.location].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, reports, search, statusFilter]);

  const handlePhoneToggle = () => {
    setShowPhone((current) => !current);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value as "all" | ReportStatus);
  };

  const handlePriorityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPriorityFilter(event.target.value as "all" | ReportPriority);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-red-100 bg-gradient-to-br from-[#b91c1c] via-[#c2410c] to-[#dc2626] p-6 text-white shadow-[0_20px_60px_rgba(185,28,28,0.2)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100">Modulo segnalazioni</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Gestisci segnalazioni, stati e allegati da un unico centro operativo.</h1>
            <p className="mt-3 text-sm leading-6 text-red-50 sm:text-base">Il flusso è stato ricostruito in React con ricerca, filtri, dettaglio e un telefono mobile simulato per il percorso operativo.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="secondary" className="w-full bg-white/15 text-white hover:bg-white/20 sm:w-auto" onClick={handlePhoneToggle}>
              {showPhone ? "Nascondi Smartphone" : "Smartphone"}
            </Button>
            <Button asChild variant="secondary" className="w-full bg-white text-red-700 hover:bg-red-50 sm:w-auto">
              <Link to="/segnalazioni/app">Apri App Segnalatore</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-[4px] border-l-red-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{reports.filter((report) => report.status === "Nuova").length}</p>
                <p className="mt-1 text-sm text-slate-500">Nuove segnalazioni</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[4px] border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{reports.filter((report) => report.status === "In lavorazione").length}</p>
                <p className="mt-1 text-sm text-slate-500">In lavorazione</p>
              </div>
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[4px] border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{reports.filter((report) => report.status === "Richiesta integrazione").length}</p>
                <p className="mt-1 text-sm text-slate-500">In integrazione</p>
              </div>
              <BadgeCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[4px] border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{reports.filter((report) => report.status === "Chiusa").length}</p>
                <p className="mt-1 text-sm text-slate-500">Chiuse</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
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
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Cerca per codice, luogo o descrizione" className="h-9 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                    <ListFilter className="h-3.5 w-3.5 text-slate-500" />
                    <label className="sr-only" htmlFor="status-filter">Filtra per stato</label>
                    <select id="status-filter" className="bg-transparent text-sm text-slate-600 outline-none" value={statusFilter} onChange={handleStatusChange}>
                      <option value="all">Tutti gli stati</option>
                      <option value="Nuova">Nuova</option>
                      <option value="In lavorazione">In lavorazione</option>
                      <option value="Presa in carico">Presa in carico</option>
                      <option value="Richiesta integrazione">Richiesta integrazione</option>
                      <option value="Integrata">Integrata</option>
                      <option value="Risolta">Risolta</option>
                      <option value="Chiusa">Chiusa</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                    <label className="sr-only" htmlFor="priority-filter">Filtra per priorità</label>
                    <select id="priority-filter" className="bg-transparent text-sm text-slate-600 outline-none" value={priorityFilter} onChange={handlePriorityChange}>
                      <option value="all">Tutte le priorità</option>
                      <option value="Bassa">Bassa</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Critica">Critica</option>
                    </select>
                  </div>
                </div>
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
                  <button key={report.id} type="button" className={`w-full rounded-2xl border p-4 text-left transition ${selectedReport?.id === report.id ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50"}`} onClick={() => setSelectedReportId(report.id)}>
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
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Priorità</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedReport.priority}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Luogo e referente</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedReport.location}{selectedReport.reporterDisplayName ? ` · ${selectedReport.reporterDisplayName}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Allegati e foto</p>
                    <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      {ATTACHMENTS_DISABLED_MESSAGE}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Timeline</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600"><CheckCircle2 className="h-4 w-4" /></div>
                        <span>{selectedReport.update}</span>
                      </div>
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
                La creazione segnalazioni e' centralizzata nella nuova App Segnalatore React riusabile.
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
