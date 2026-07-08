import { useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MessageSquare,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type SegnalatoreAppVariant = "page" | "mobile";
type SegnalatoreRoleGroup = "operational" | "manager" | "safety";
type ReportPriority = "Bassa" | "Media" | "Alta";
type ReportStatus = "Nuova" | "In carico" | "In attesa integrazione" | "Chiusa";

type SegnalatoreAppProps = {
  variant?: SegnalatoreAppVariant;
  role?: string;
  className?: string;
};

type SegnalatoreReport = {
  code: string;
  title: string;
  status: ReportStatus;
  priority: ReportPriority;
  date: string;
  location: string;
  update: string;
  description: string;
  visibleTo: SegnalatoreRoleGroup[];
};

type DraftReport = {
  location: string;
  title: string;
  description: string;
  priority: ReportPriority;
};

const defaultDraft: DraftReport = {
  location: "",
  title: "",
  description: "",
  priority: "Media",
};

// Mock temporanei: sostituire con API LogosSafety in sprint successivo.
const mockReports: SegnalatoreReport[] = [
  {
    code: "SEG-2026-014",
    title: "Transenna danneggiata in area carico",
    status: "In carico",
    priority: "Alta",
    date: "08 lug 2026",
    location: "Appalto Milano - Impianto Nord",
    update: "Presa in carico dal team sicurezza",
    description: "La transenna vicino alla baia di carico risulta piegata e instabile.",
    visibleTo: ["operational", "manager", "safety"],
  },
  {
    code: "SEG-2026-012",
    title: "Richiesta integrazione foto DPI",
    status: "In attesa integrazione",
    priority: "Media",
    date: "07 lug 2026",
    location: "Commessa Torino - Linea 2",
    update: "Richiesta una foto aggiuntiva dell'area",
    description: "La segnalazione richiede una seconda foto per completare la verifica.",
    visibleTo: ["operational", "manager", "safety"],
  },
  {
    code: "SEG-2026-009",
    title: "Verifica passaggio pedonale interno",
    status: "Nuova",
    priority: "Bassa",
    date: "05 lug 2026",
    location: "Impianto Bologna",
    update: "In attesa di prima valutazione",
    description: "Il passaggio pedonale necessita di nuova segnaletica orizzontale.",
    visibleTo: ["manager", "safety"],
  },
  {
    code: "SEG-2026-006",
    title: "Chiusura intervento parapetto",
    status: "Chiusa",
    priority: "Alta",
    date: "02 lug 2026",
    location: "Appalto Roma - Copertura",
    update: "Intervento chiuso con evidenza allegata",
    description: "Il parapetto provvisorio e' stato sostituito con protezione certificata.",
    visibleTo: ["safety"],
  },
];

const roleGroups: Record<string, SegnalatoreRoleGroup> = {
  admin: "safety",
  rspp: "safety",
  responsabile_sicurezza: "safety",
  sicurezza: "safety",
  aspp: "safety",
  operatore_sicurezza: "safety",
  capo_area: "manager",
  capo_impianto: "manager",
  referente_commessa: "manager",
  segnalatore: "operational",
  dipendente: "operational",
  operatore: "operational",
};

const roleLabels: Record<string, string> = {
  admin: "Amministratore",
  rspp: "RSPP",
  responsabile_sicurezza: "Responsabile sicurezza",
  sicurezza: "Sicurezza",
  aspp: "ASPP",
  operatore_sicurezza: "Operatore sicurezza",
  capo_area: "Capo area",
  capo_impianto: "Capo impianto",
  referente_commessa: "Referente commessa",
  segnalatore: "Segnalatore",
  dipendente: "Dipendente",
  operatore: "Operatore",
};

const subtitles: Record<SegnalatoreRoleGroup, string> = {
  operational: "Inserisci nuove segnalazioni e segui gli aggiornamenti delle tue richieste.",
  manager: "Monitora le segnalazioni dei tuoi impianti e aggiungi commenti operativi.",
  safety: "Gestisci segnalazioni, prese in carico, richieste integrazione e chiusure.",
};

const actionsByGroup: Record<SegnalatoreRoleGroup, string[]> = {
  operational: ["Visualizza", "Presa visione"],
  manager: ["Visualizza", "Commenta", "Presa visione"],
  safety: ["Visualizza", "Prendi in carico", "Richiedi integrazione", "Cambia stato", "Chiudi"],
};

const statusClasses: Record<ReportStatus, string> = {
  Nuova: "bg-slate-100 text-slate-700",
  "In carico": "bg-blue-100 text-blue-700",
  "In attesa integrazione": "bg-amber-100 text-amber-700",
  Chiusa: "bg-emerald-100 text-emerald-700",
};

const priorityClasses: Record<ReportPriority, string> = {
  Bassa: "bg-emerald-50 text-emerald-700",
  Media: "bg-amber-50 text-amber-700",
  Alta: "bg-red-50 text-red-700",
};

function normalizeRole(role?: string | null) {
  return role?.trim() || "segnalatore";
}

function getRoleGroup(role: string): SegnalatoreRoleGroup {
  return roleGroups[role] ?? "operational";
}

export function SegnalatoreApp(props: Readonly<SegnalatoreAppProps>) {
  const { variant = "page", role, className } = props;
  const idPrefix = useId();
  const { user } = useAuth();
  const currentRole = normalizeRole(role ?? user?.role);
  const roleGroup = getRoleGroup(currentRole);
  const roleLabel = roleLabels[currentRole] ?? roleLabels.segnalatore;
  const isMobile = variant === "mobile";

  const [activeTab, setActiveTab] = useState<"new" | "reports">("new");
  const [draft, setDraft] = useState<DraftReport>(defaultDraft);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [reports, setReports] = useState<SegnalatoreReport[]>(mockReports);
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

  return (
    <section
      className={cn(
        "bg-white text-slate-900",
        isMobile ? "min-h-full px-4 pb-6 pt-4" : "mx-auto max-w-5xl rounded-2xl border border-slate-200 p-5 shadow-sm",
        className,
      )}
    >
      <header className={cn("border-b border-slate-100 pb-4", isMobile ? "text-center" : "flex items-center justify-between gap-4")}>
        <div className={cn("min-w-0", isMobile && "flex flex-col items-center")}>
          <img src="/assets/LogoLogos.png" alt="Logos" className={cn("w-auto object-contain", isMobile ? "h-12" : "h-14")} />
          <div className={cn(isMobile ? "mt-3" : "mt-4")}>
            <h1 className={cn("font-semibold text-red-600", isMobile ? "text-xl" : "text-2xl")}>Segnalazioni</h1>
            <p className={cn("mt-1 text-slate-600", isMobile ? "text-xs leading-5" : "text-sm")}>
              {subtitles[roleGroup]}
            </p>
          </div>
        </div>
        {!isMobile && (
          <div className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            Ruolo: {roleLabel}
          </div>
        )}
      </header>

      <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        <button
          type="button"
          className={cn("rounded-lg px-3 py-2 transition", activeTab === "new" ? "bg-white text-red-700 shadow-sm" : "text-slate-600")}
          onClick={() => setActiveTab("new")}
        >
          Nuova
        </button>
        <button
          type="button"
          className={cn("rounded-lg px-3 py-2 transition", activeTab === "reports" ? "bg-white text-red-700 shadow-sm" : "text-slate-600")}
          onClick={() => setActiveTab("reports")}
        >
          Segnalazioni
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </p>
      )}

      {activeTab === "new" ? (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor={`${idPrefix}-location`} className="mb-1 block text-sm font-medium text-slate-800">
              Appalto / Commessa / Impianto *
            </label>
            <select
              id={`${idPrefix}-location`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.location}
              onChange={handleDraftChange("location")}
            >
              <option value="">Seleziona contesto</option>
              <option value="Appalto Milano - Impianto Nord">Appalto Milano - Impianto Nord</option>
              <option value="Commessa Torino - Linea 2">Commessa Torino - Linea 2</option>
              <option value="Impianto Bologna">Impianto Bologna</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-sm font-medium text-slate-800">
              Titolo *
            </label>
            <input
              id={`${idPrefix}-title`}
              type="text"
              placeholder="Es. Transenna danneggiata"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.title}
              onChange={handleDraftChange("title")}
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-description`} className="mb-1 block text-sm font-medium text-slate-800">
              Descrizione *
            </label>
            <textarea
              id={`${idPrefix}-description`}
              rows={isMobile ? 4 : 5}
              placeholder="Descrivi il problema riscontrato"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.description}
              onChange={handleDraftChange("description")}
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-priority`} className="mb-1 block text-sm font-medium text-slate-800">
              Priorita'
            </label>
            <select
              id={`${idPrefix}-priority`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.priority}
              onChange={handleDraftChange("priority")}
            >
              <option value="Bassa">Bassa</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${idPrefix}-attachments`} className="mb-1 block text-sm font-medium text-slate-800">
              Foto / Allegati
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              Seleziona file
              <input
                id={`${idPrefix}-attachments`}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span key={attachment} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {attachment}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Invia Segnalazione
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{isMobile ? "Le tue segnalazioni" : "Segnalazioni visibili"}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {visibleReports.length}
            </span>
          </div>

          <div className="space-y-3">
            {visibleReports.map((report) => (
              <article
                key={report.code}
                className={cn(
                  "rounded-xl border p-3 transition",
                  selectedReport?.code === report.code ? "border-red-200 bg-red-50" : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{report.code}</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-900">{report.title}</h2>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", statusClasses[report.status])}>
                    {report.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {report.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {report.date} - {report.update}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", priorityClasses[report.priority])}>
                    {report.priority}
                  </span>
                  {actionsByGroup[roleGroup].map((action) => (
                    <button
                      key={`${report.code}-${action}`}
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                      onClick={() => handleAction(action, report)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {selectedReport && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Eye className="h-4 w-4 text-red-600" />
                Dettaglio minimo
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {selectedReport.status}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  Commenti UI-only
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
                  RBAC server-side futuro
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
