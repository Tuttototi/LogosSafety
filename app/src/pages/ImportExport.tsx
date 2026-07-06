import { useState, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronRight,
  FileDown,
  Table,
  RefreshCw,
  FileCheck,
  SkipForward,
  RotateCcw,
  Ban,
} from "lucide-react";
import {
  type ImportType,
  FIELD_DEFS,
  readSheet,
  validateRows,
  getImportRowValidator,
  generateErrorExcel,
  generateTemplateExcel,
  downloadExcel,
} from "@/lib/excel/import";
import { useAuth } from "@/hooks/useAuth";

type Step = "select" | "upload" | "preview" | "result";
type DuplicateAction = "ignora" | "aggiorna" | "blocca";

const importTypeLabels: Record<ImportType, string> = {
  dipendenti: "Dipendenti",
  attestati: "Attestati formazione",
  visite: "Visite mediche",
  mansioni: "Mansioni",
  corsi: "Corsi formazione",
  aziende: "Aziende",
  sedi: "Sedi",
  commesse: "Commesse",
};

const duplicateActionConfig: Record<
  DuplicateAction,
  {
    label: string;
    description: string;
    icon: typeof SkipForward;
    color: string;
  }
> = {
  ignora: {
    label: "Ignora",
    description: "Salta i record duplicati",
    icon: SkipForward,
    color: "text-blue-600",
  },
  aggiorna: {
    label: "Aggiorna",
    description: "Sovrascrivi i dati esistenti",
    icon: RotateCcw,
    color: "text-amber-600",
  },
  blocca: {
    label: "Blocca",
    description: "Ferma se trova un duplicato",
    icon: Ban,
    color: "text-red-600",
  },
};

export default function ImportExport() {
  const { user } = useAuth();
  const canManageClinicalData = user
    ? ["admin", "responsabile_sicurezza", "medico_competente"].includes(
        user.role
      )
    : false;
  const availableImportTypes = (
    Object.keys(importTypeLabels) as ImportType[]
  ).filter(type => type !== "visite" || canManageClinicalData);
  const [step, setStep] = useState<Step>("select");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsedRows, setParsedRows] = useState<ReturnType<typeof validateRows>>(
    []
  );
  const [duplicateAction, setDuplicateAction] =
    useState<DuplicateAction>("ignora");
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; msg: string }[];
    blocked?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importWorkers = trpc.import.importWorkers.useMutation({
    onSuccess: r => {
      setImportResult(r);
      setStep("result");
    },
    onError: e => toast.error(e.message),
  });
  const importCerts = trpc.import.importCertificates.useMutation({
    onSuccess: r => {
      setImportResult(r);
      setStep("result");
    },
    onError: e => toast.error(e.message),
  });
  const importVisits = trpc.import.importVisits.useMutation({
    onSuccess: r => {
      setImportResult(r);
      setStep("result");
    },
    onError: e => toast.error(e.message),
  });
  const importCompanies = trpc.import.importCompanies.useMutation({
    onSuccess: r => {
      setImportResult(r);
      setStep("result");
    },
    onError: e => toast.error(e.message),
  });

  const importSites = trpc.import.importSites.useMutation({
    onSuccess: r => {
      setImportResult(r);
      setStep("result");
    },
    onError: e => toast.error(e.message),
  });

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!importType) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File troppo grande: max 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result as ArrayBuffer;
        const rows = readSheet(buf, 0);
        if (rows.length === 0) {
          toast.error("Nessun dato trovato nel file");
          return;
        }
        const mappings = FIELD_DEFS[importType];
        const validated = validateRows(
          rows,
          mappings,
          undefined,
          getImportRowValidator(importType)
        );
        setParsedRows(validated);
        setDuplicateAction("ignora"); // reset default
        setStep("preview");
      };
      reader.readAsArrayBuffer(file);
    },
    [importType]
  );

  const handleImport = () => {
    if (!importType || parsedRows.length === 0) return;
    if (importType === "visite" && !canManageClinicalData) {
      toast.error("Non autorizzato a importare dati sanitari");
      return;
    }
    const validRows = parsedRows.filter(
      r => !r.errors.some(e => e.severity === "error")
    );
    if (validRows.length === 0) {
      toast.error("Nessuna riga valida da importare");
      return;
    }

    const data = validRows.map(r => r.data);
    const payload = { rows: data, duplicateAction };
    if (importType === "dipendenti") {
      importWorkers.mutate(payload as Parameters<typeof importWorkers.mutate>[0]);
    } else if (importType === "attestati") {
      importCerts.mutate(payload as Parameters<typeof importCerts.mutate>[0]);
    } else if (importType === "visite") {
      importVisits.mutate(payload as Parameters<typeof importVisits.mutate>[0]);
    } else if (importType === "aziende") {
      importCompanies.mutate(payload as Parameters<typeof importCompanies.mutate>[0]);
    } else if (importType === "sedi") {
      importSites.mutate(payload as Parameters<typeof importSites.mutate>[0]);
    }
    else {
      toast.info("Importazione per questo tipo in fase di implementazione");
    }
  };

  const downloadErrorFile = () => {
    if (!parsedRows.length) return;
    const buf = generateErrorExcel(parsedRows);
    downloadExcel(
      buf,
      `errori_${importType}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const downloadTemplate = (type: ImportType) => {
    const buf = generateTemplateExcel(type);
    downloadExcel(buf, `template_${type}.xlsx`);
  };

  const totalErrors = parsedRows.filter(r =>
    r.errors.some(e => e.severity === "error")
  ).length;
  const totalWarnings = parsedRows.filter(
    r =>
      r.errors.some(e => e.severity === "warning") &&
      !r.errors.some(e => e.severity === "error")
  ).length;
  const validRows = parsedRows.filter(
    r => !r.errors.some(e => e.severity === "error")
  ).length;

  const isImporting =
    importWorkers.isPending ||
    importCerts.isPending ||
    importVisits.isPending ||
    importCompanies.isPending ||
    importSites.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Importazione / Esportazione Excel
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Importa ed esporta dati da file Excel in modo controllato e tracciato
        </p>
      </div>

      {/* Progress */}
      <div className="flex flex-wrap items-center gap-2">
        {(["select", "upload", "preview", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-blue-700 text-white"
                  : (
                        ["select", "upload", "preview", "result"] as Step[]
                      ).indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {(["select", "upload", "preview", "result"] as Step[]).indexOf(
                step
              ) > i ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs font-medium ${step === s ? "text-blue-700" : "text-gray-500"}`}
            >
              {s === "select"
                ? "Tipo"
                : s === "upload"
                  ? "File"
                  : s === "preview"
                    ? "Anteprima"
                    : "Risultato"}
            </span>
            {i < 3 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select type */}
      {step === "select" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                1. Seleziona il tipo di importazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableImportTypes.map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      setImportType(key);
                      setStep("upload");
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                      importType === key
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <Table className="w-5 h-5 text-gray-500 mb-2" />
                    <p className="text-sm font-semibold text-gray-900">
                      {importTypeLabels[key]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {FIELD_DEFS[key].length} campi
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="w-4 h-4" /> Template scaricabili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableImportTypes.map(type => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => downloadTemplate(type)}
                  >
                    <FileDown className="w-3 h-3" /> {importTypeLabels[type]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === "upload" && importType && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              2. Carica file Excel — {importTypeLabels[importType]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Clicca per caricare file .xlsx o .xls
              </p>
              <p className="text-xs text-gray-500 mt-1">Massimo 10MB</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => downloadTemplate(importType)}
              >
                <FileDown className="w-3 h-3" /> Scarica template
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setStep("select")}
              >
                Indietro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && importType && (
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="text-base">
                  3. Anteprima dati — {importTypeLabels[importType]}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                    {validRows} validi
                  </Badge>
                  {totalErrors > 0 && (
                    <Badge className="bg-red-50 text-red-700 border-0 text-xs">
                      {totalErrors} errori
                    </Badge>
                  )}
                  {totalWarnings > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">
                      {totalWarnings} avvisi
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {totalErrors > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    Ci sono {totalErrors} righe con errori bloccanti. Puoi
                    scaricare il file errori o importare solo le righe valide.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-shrink-0"
                    onClick={downloadErrorFile}
                  >
                    <FileDown className="w-3 h-3" /> Scarica errori
                  </Button>
                </div>
              )}

              <div className="border rounded-md overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">
                        Riga
                      </th>
                      {FIELD_DEFS[importType].slice(0, 6).map(f => (
                        <th
                          key={f.dbField}
                          className="px-3 py-2 text-left font-semibold text-gray-500"
                        >
                          {f.excelCol}
                          {f.required && " *"}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">
                        Stato
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map(row => {
                      const hasError = row.errors.some(
                        e => e.severity === "error"
                      );
                      const hasWarning = row.errors.some(
                        e => e.severity === "warning"
                      );
                      return (
                        <tr
                          key={row.rowNum}
                          className={`border-t ${hasError ? "bg-red-50" : hasWarning ? "bg-amber-50" : ""}`}
                        >
                          <td className="px-3 py-2 text-gray-500">
                            {row.rowNum}
                          </td>
                          {FIELD_DEFS[importType].slice(0, 6).map(f => (
                            <td
                              key={f.dbField}
                              className="px-3 py-2 truncate max-w-[120px]"
                              title={row.data[f.dbField]}
                            >
                              {row.data[f.dbField]}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {hasError ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : hasWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedRows.length > 50 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    ...e altre {parsedRows.length - 50} righe
                  </p>
                )}
              </div>

              {/* Error details */}
              {totalErrors > 0 && (
                <div className="mt-4 space-y-1 max-h-48 overflow-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Dettaglio errori
                  </p>
                  {parsedRows
                    .filter(r => r.errors.some(e => e.severity === "error"))
                    .slice(0, 20)
                    .map(row => (
                      <div
                        key={row.rowNum}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <span className="text-red-500 font-mono flex-shrink-0">
                          R{row.rowNum}
                        </span>
                        <span className="text-gray-600">
                          {row.errors
                            .filter(e => e.severity === "error")
                            .map(e => `${e.column}: ${e.message}`)
                            .join("; ")}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate action selector */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-500" /> Azione sui
                duplicati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["ignora", "aggiorna", "blocca"] as DuplicateAction[]).map(
                  action => {
                    const config = duplicateActionConfig[action];
                    const Icon = config.icon;
                    return (
                      <button
                        key={action}
                        onClick={() => setDuplicateAction(action)}
                        className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                          duplicateAction === action
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span
                            className={`text-sm font-semibold ${duplicateAction === action ? "text-blue-700" : "text-gray-700"}`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {config.description}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
              {duplicateAction === "blocca" && (
                <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Se viene rilevato anche un solo
                  duplicato, l&apos;intera importazione verrà annullata.
                </p>
              )}
              {duplicateAction === "aggiorna" && (
                <p className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> I record esistenti verranno
                  sovrascritti con i nuovi dati.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("upload")}
            >
              Indietro
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleImport}
              disabled={isImporting || validRows === 0}
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4" />
              )}
              {isImporting ? "Importazione..." : `Importa ${validRows} righe`}
            </Button>
            {totalErrors > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-600"
                onClick={downloadErrorFile}
              >
                <FileDown className="w-3 h-3" /> Scarica errori
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && importResult && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4. Risultato importazione
              </CardTitle>
              {importResult.blocked && (
                <Badge className="bg-red-100 text-red-700 border-0">
                  Importazione bloccata
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {importResult.imported}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">
                  Importati
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {importResult.updated}
                </p>
                <p className="text-[10px] text-blue-600 font-medium">
                  Aggiornati
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-700">
                  {importResult.skipped}
                </p>
                <p className="text-[10px] text-gray-600 font-medium">Saltati</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700">
                  {importResult.errors.length}
                </p>
                <p className="text-[10px] text-red-600 font-medium">Errori</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {parsedRows.length}
                </p>
                <p className="text-[10px] text-purple-600 font-medium">
                  Totale lette
                </p>
              </div>
            </div>

            {importResult.blocked && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  L&apos;importazione è stata bloccata perché è stato rilevato
                  almeno un record duplicato e l&apos;azione era impostata su
                  &quot;Blocca&quot;.
                </p>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="border rounded-md overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">
                        Riga
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Errore
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-gray-500">{e.row}</td>
                        <td className="px-3 py-2 text-red-600">{e.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setStep("select");
                  setImportType(null);
                  setParsedRows([]);
                  setImportResult(null);
                }}
              >
                <RefreshCw className="w-3 h-3" /> Nuova importazione
              </Button>
              {importResult.errors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={downloadErrorFile}
                >
                  <FileDown className="w-3 h-3" /> Scarica errori
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
