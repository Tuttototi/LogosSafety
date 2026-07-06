import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarDays, Camera, CheckCircle2, FileText, ListFilter, PlusCircle, Search, Sparkles, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ReportStatus = "Nuova" | "In lavorazione" | "In attesa" | "Richiesta chiusura" | "Chiusa";
type ReportPriority = "Bassa" | "Media" | "Alta" | "Critica";
type ReportCategory = "Infortuni" | "Pericolo" | "Attrezzature" | "Ambiente" | "Procedura";

type ReportItem = {
  id: number;
  code: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  location: string;
  createdAt: string;
  reporter: string;
  attachments: string[];
  evidence: string[];
};

const initialReports: ReportItem[] = [
  {
    id: 1,
    code: "SR-2026-001",
    title: "Presenza di corda sospesa in area magazzino",
    description: "Rilevata una corda sospesa in prossimità del ponteggio. L’area è stata immediatamente delimitata.",
    category: "Pericolo",
    priority: "Alta",
    status: "In lavorazione",
    location: "Magazzino Centrale",
    createdAt: "02 lug 2026",
    reporter: "Marco B.",
    attachments: ["foto_01.jpg", "verifica.pdf"],
    evidence: ["Segnalazione ricevuta alle 09:12", "Presa in carico alle 09:16", "Verifica in corso"],
  },
  {
    id: 2,
    code: "SR-2026-002",
    title: "Guasto alla lampada di emergenza",
    description: "La lampada nel corridoio principale non si accende. Richiesta verifica elettrica.",
    category: "Attrezzature",
    priority: "Media",
    status: "Nuova",
    location: "Corridoio 2",
    createdAt: "03 lug 2026",
    reporter: "Sara L.",
    attachments: ["foto_02.jpg"],
    evidence: ["Segnalazione ricevuta alle 14:08"],
  },
  {
    id: 3,
    code: "SR-2026-003",
    title: "Rilevamento di acqua in area cantiere",
    description: "Presenza di ristagno vicino al punto di accesso. Richiesta intervento pulizia e sicurezza.",
    category: "Ambiente",
    priority: "Critica",
    status: "Richiesta chiusura",
    location: "Cantiere Nord",
    createdAt: "04 lug 2026",
    reporter: "Luca P.",
    attachments: ["report_03.pdf", "foto_03.jpg"],
    evidence: ["Segnalazione ricevuta alle 07:30", "Chiusura richiesta dalle 11:40"],
  },
];

const statusColors: Record<ReportStatus, string> = {
  Nuova: "bg-slate-100 text-slate-700",
  "In lavorazione": "bg-amber-100 text-amber-700",
  "In attesa": "bg-blue-100 text-blue-700",
  "Richiesta chiusura": "bg-purple-100 text-purple-700",
  Chiusa: "bg-emerald-100 text-emerald-700",
};

const priorityColors: Record<ReportPriority, string> = {
  Bassa: "bg-emerald-50 text-emerald-700",
  Media: "bg-amber-50 text-amber-700",
  Alta: "bg-orange-50 text-orange-700",
  Critica: "bg-red-50 text-red-700",
};

export default function Segnalazioni() {
  const [reports, setReports] = useState(initialReports);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ReportPriority>("all");
  const [selectedReport, setSelectedReport] = useState<ReportItem>(initialReports[0]);
  const [showPhone, setShowPhone] = useState(false);
  const [phonePosition, setPhonePosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPhone, setIsDraggingPhone] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const phoneRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "Pericolo" as ReportCategory,
    priority: "Alta" as ReportPriority,
    location: "",
    reporter: "",
  });
  const [attachments, setAttachments] = useState<string[]>([]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = !search || [report.title, report.description, report.code, report.location].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, reports, search, statusFilter]);

  const handleCreateReport = () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      toast.error("Compila titolo e descrizione della segnalazione");
      return;
    }

    const newReport: ReportItem = {
      id: Date.now(),
      code: `SR-2026-${String(reports.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      priority: draft.priority,
      status: "Nuova",
      location: draft.location.trim() || "Area non specificata",
      createdAt: "Oggi",
      reporter: draft.reporter.trim() || "Utente corrente",
      attachments: attachments.length ? attachments : ["allegato.pdf"],
      evidence: ["Segnalazione ricevuta", "In attesa di presa in carico"],
    };

    setReports((current) => [newReport, ...current]);
    setSelectedReport(newReport);
    setDraft({ title: "", description: "", category: "Pericolo", priority: "Alta", location: "", reporter: "" });
    setAttachments([]);
    toast.success("Segnalazione creata con successo");
  };

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).map((file) => file.name);
    if (!selected.length) return;
    setAttachments((current) => [...current, ...selected]);
    event.target.value = "";
  };

  const handlePhonePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("input, textarea, select, button")) return;

    const rect = phoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDraggingPhone(true);
    setDragOffset({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    document.body.classList.add("select-none");
  };

  useEffect(() => {
    if (!isDraggingPhone) return;

    const handlePointerMove = (event: PointerEvent) => {
      setPhonePosition({ x: event.clientX - dragOffset.x, y: event.clientY - dragOffset.y });
    };

    const handlePointerUp = () => {
      setIsDraggingPhone(false);
      document.body.classList.remove("select-none");
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("select-none");
    };
  }, [dragOffset.x, dragOffset.y, isDraggingPhone]);

  const handlePhoneToggle = () => {
    if (showPhone) {
      setShowPhone(false);
      return;
    }

    setPhonePosition(null);
    setShowPhone(true);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value as "all" | ReportStatus);
  };

  const handlePriorityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPriorityFilter(event.target.value as "all" | ReportPriority);
  };

  const handleRemoveAttachment = (attachment: string) => {
    setAttachments((current) => current.filter((item) => item !== attachment));
  };

  const handleDraftTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, title: event.target.value }));
  };

  const handleDraftDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft((current) => ({ ...current, description: event.target.value }));
  };

  const handleDraftCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, category: event.target.value as ReportCategory }));
  };

  const handleDraftPriorityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, priority: event.target.value as ReportPriority }));
  };

  const handleDraftLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, location: event.target.value }));
  };

  const handleDraftReporterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, reporter: event.target.value }));
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
          <Button variant="secondary" className="w-full bg-white/15 text-white hover:bg-white/20 sm:w-auto" onClick={handlePhoneToggle}>
            {showPhone ? "Nascondi Smartphone" : "Smartphone"}
          </Button>
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
                <p className="text-2xl font-semibold text-slate-900">{reports.filter((report) => report.status === "Richiesta chiusura").length}</p>
                <p className="mt-1 text-sm text-slate-500">Da chiudere</p>
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
                      <option value="In attesa">In attesa</option>
                      <option value="Richiesta chiusura">Richiesta chiusura</option>
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
                {filteredReports.map((report) => (
                  <button key={report.id} type="button" className={`w-full rounded-2xl border p-4 text-left transition ${selectedReport?.id === report.id ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50"}`} onClick={() => setSelectedReport(report)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{report.code}</p>
                        <p className="text-sm text-slate-600">{report.title}</p>
                      </div>
                      <Badge className={statusColors[report.status]}>{report.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{report.createdAt}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{report.location}</span>
                      <Badge className={priorityColors[report.priority]}>{report.priority}</Badge>
                    </div>
                  </button>
                ))}
                {!filteredReports.length && <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Nessuna segnalazione corrisponde ai filtri impostati.</p>}
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
                <p className="mt-1 text-sm text-slate-700">{selectedReport.location} · {selectedReport.reporter}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Allegati e foto</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedReport.attachments.map((attachment) => (
                    <Badge key={attachment} variant="outline" className="bg-white text-slate-600">{attachment}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Timeline</p>
                <div className="mt-2 space-y-2">
                  {selectedReport.evidence.map((step, index) => (
                    <div key={`${step}-${index}`} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600"><CheckCircle2 className="h-4 w-4" /></div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Nuova segnalazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Titolo della segnalazione" value={draft.title} onChange={handleDraftTitleChange} />
              <Textarea placeholder="Descrizione del rischio o dell’anomalia" value={draft.description} onChange={handleDraftDescriptionChange} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sr-only" htmlFor="report-category">Categoria della segnalazione</label>
                <select id="report-category" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none" value={draft.category} onChange={handleDraftCategoryChange}>
                  <option value="Pericolo">Pericolo</option>
                  <option value="Infortuni">Infortuni</option>
                  <option value="Attrezzature">Attrezzature</option>
                  <option value="Ambiente">Ambiente</option>
                  <option value="Procedura">Procedura</option>
                </select>
                <label className="sr-only" htmlFor="report-priority">Priorità della segnalazione</label>
                <select id="report-priority" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none" value={draft.priority} onChange={handleDraftPriorityChange}>
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Critica">Critica</option>
                </select>
              </div>
              <Input placeholder="Luogo / area interessata" value={draft.location} onChange={handleDraftLocationChange} />
              <Input placeholder="Referente o operatore" value={draft.reporter} onChange={handleDraftReporterChange} />
              <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <span key={attachment} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {attachment}
                      <button type="button" title={`Rimuovi allegato ${attachment}`} className="text-slate-400 hover:text-slate-700" onClick={() => handleRemoveAttachment(attachment)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  Allegati o foto
                  <input type="file" multiple className="hidden" onChange={handleAttachmentSelection} />
                </label>
              </div>
              <Button className="w-full gap-2" onClick={handleCreateReport}>
                <PlusCircle className="h-4 w-4" />
                Crea segnalazione
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPhone && (
        <div
          ref={phoneRef}
          className="fixed bottom-6 right-6 z-50 w-[280px] cursor-grab rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
          style={phonePosition ? { left: phonePosition.x, top: phonePosition.y, right: "auto", bottom: "auto" } : undefined}
          onPointerDown={handlePhonePointerDown}
        >
          <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-3 text-white">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Flusso mobile</p>
              <p className="text-sm font-semibold">Segnalazione in corso</p>
            </div>
            <button type="button" title="Chiudi telefono fluttuante" className="rounded-full bg-white/10 p-1.5" onClick={() => setShowPhone(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-red-600" />
              <p className="text-sm font-semibold text-slate-900">Foto e allegati</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl bg-white p-2 text-sm text-slate-600">1. Foto scattata e caricata</div>
              <div className="rounded-xl bg-white p-2 text-sm text-slate-600">2. Segnalazione inoltrata al team sicurezza</div>
              <div className="rounded-xl bg-white p-2 text-sm text-slate-600">3. Stato aggiornato in tempo reale</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
