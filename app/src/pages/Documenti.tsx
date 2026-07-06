import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText, Search, Upload, FileCheck, Award, ClipboardCheck,
  HardHat, Mail, FileArchive, Loader2, Download, Eye,
} from "lucide-react";

const docTypeIcons: Record<string, typeof FileText> = {
  attestato: Award, giudizio_idoneita: FileCheck, lettera_incarico: ClipboardCheck,
  consegna_dpi: HardHat, verbale_addestramento: FileText, richiesta_verifica: FileText,
  email: Mail, contratto: FileText, cartella_clinica: FileText,
  documento_identita: FileText, patente: FileText, altro: FileArchive,
};
const docTypeColors: Record<string, string> = {
  attestato: "bg-blue-50 text-blue-700", giudizio_idoneita: "bg-emerald-50 text-emerald-700",
  lettera_incarico: "bg-purple-50 text-purple-700", consegna_dpi: "bg-orange-50 text-orange-700",
  verbale_addestramento: "bg-gray-100 text-gray-700", richiesta_verifica: "bg-amber-50 text-amber-700",
  email: "bg-cyan-50 text-cyan-700", contratto: "bg-indigo-50 text-indigo-700",
  cartella_clinica: "bg-rose-50 text-rose-700", documento_identita: "bg-gray-100 text-gray-600",
  patente: "bg-green-50 text-green-700", altro: "bg-gray-100 text-gray-600",
};
const docTypeLabels = {
  attestato: "Attestato", giudizio_idoneita: "Giudizio idoneita", lettera_incarico: "Lettera incarico",
  consegna_dpi: "Consegna DPI", verbale_addestramento: "Verbale addestramento",
  richiesta_verifica: "Richiesta verifica", email: "Email", contratto: "Contratto",
  cartella_clinica: "Cartella clinica", documento_identita: "Documento identita",
  patente: "Patente", altro: "Altro",
} as const;
type DocumentType = keyof typeof docTypeLabels;

const entityTypeLabels: Record<string, string> = {
  dipendente: "Dipendente", corso: "Corso", attestato: "Attestato",
  visita_medica: "Visita medica", mansione: "Mansione", commessa: "Commessa",
  azienda: "Azienda", generale: "Generale",
};

export default function Documenti() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | undefined>();
  const [uploading, setUploading] = useState(false);
  const [accessingDocument, setAccessingDocument] = useState<{
    id: number;
    intent: "view" | "download";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: docs, isLoading } = trpc.documents.list.useQuery(
    typeFilter ? { documentType: typeFilter } : undefined
  );
  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Documento caricato"); },
    onError: (e) => toast.error(e.message),
  });
  const accessDoc = trpc.documents.access.useMutation();

  const filteredDocs = (docs ?? []).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) ||
      (d.worker ? `${d.worker.firstName} ${d.worker.lastName}`.toLowerCase().includes(q) : false) ||
      (d.fileName?.toLowerCase().includes(q) ?? false);
  });

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

  // TODO: Replace FileReader/dataURL with server-side S3/bucket upload for production.
  // Current approach stores files as data URLs in the database (works for <1MB files).
  // For production: upload to S3 → get public URL → save URL in DB.

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File troppo grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Massimo consentito: 10MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        createDoc.mutate({
          entityType: "generale",
          documentType: inferDocType(file.name),
          title: file.name.replace(/\.[^.]+$/, ""),
          fileUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("Errore durante il caricamento");
    }
  };

  function inferDocType(filename: string): "attestato" | "giudizio_idoneita" | "verbale_addestramento" | "consegna_dpi" | "altro" {
    const f = filename.toLowerCase();
    if (f.includes("attest")) return "attestato";
    if (f.includes("idone")) return "giudizio_idoneita";
    if (f.includes("verbale") || f.includes("addestr")) return "verbale_addestramento";
    if (f.includes("dpi")) return "consegna_dpi";
    return "altro";
  }

  const handleDocumentAccess = async (
    id: number,
    intent: "view" | "download"
  ) => {
    setAccessingDocument({ id, intent });
    try {
      const result = await accessDoc.mutateAsync({ id, intent });
      if (intent === "view") {
        window.open(result.content, "_blank", "noopener,noreferrer");
        return;
      }
      const a = document.createElement("a");
      a.href = result.content;
      a.download = result.fileName ?? "documento";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossibile accedere al documento"
      );
    } finally {
      setAccessingDocument(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documenti e allegati</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? "Caricamento..." : `${filteredDocs.length} documenti nel sistema`}
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileSelect} className="hidden" />
          <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || createDoc.isPending}>
            {uploading || createDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Carica documento
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-dashed border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
        <CardContent className="p-8 text-center">
          {uploading ? <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" /> : <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />}
          <p className="text-sm font-medium text-gray-700">
            {uploading ? "Caricamento in corso..." : "Trascina i file qui o clicca per caricare"}
          </p>
          <p className="text-xs text-gray-500 mt-1">PDF, immagini, Excel, Word — fino a 10MB</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Cerca documento..." className="pl-8 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setTypeFilter(undefined)} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${!typeFilter ? "bg-blue-700 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Tutti</button>
          {(Object.entries(docTypeLabels) as [DocumentType, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTypeFilter(typeFilter === key ? undefined : key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${typeFilter === key ? "bg-blue-700 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="w-8 h-8 text-gray-300 mx-auto animate-spin" /><p className="text-sm text-gray-500 mt-2">Caricamento documenti...</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = docTypeIcons[doc.documentType] ?? FileText;
            const colorClass = docTypeColors[doc.documentType] ?? "bg-gray-100 text-gray-600";
            return (
              <Card key={doc.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.title}>{doc.title}</p>
                      {doc.worker && <p className="text-xs text-gray-500 mt-0.5">{doc.worker.firstName} {doc.worker.lastName}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className={`${colorClass} border-0 text-[9px]`}>{docTypeLabels[doc.documentType] ?? doc.documentType}</Badge>
                        <Badge variant="outline" className="text-[9px] bg-gray-50">{entityTypeLabels[doc.entityType] ?? doc.entityType}</Badge>
                        {doc.expiryDate && <span className="text-[10px] text-amber-600">Scade: {new Date(doc.expiryDate).toLocaleDateString("it-IT")}</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {doc.hasContent && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1"
                              disabled={accessDoc.isPending}
                              onClick={() =>
                                handleDocumentAccess(doc.id, "view")
                              }
                            >
                              {accessingDocument?.id === doc.id &&
                              accessingDocument.intent === "view" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}{" "}
                              Apri
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1"
                              disabled={accessDoc.isPending}
                              onClick={() =>
                                handleDocumentAccess(doc.id, "download")
                              }
                            >
                              {accessingDocument?.id === doc.id &&
                              accessingDocument.intent === "download" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}{" "}
                              Scarica
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredDocs.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nessun documento trovato</p>
          <p className="text-xs text-gray-400 mt-1">Carica il primo documento usando il pulsante sopra</p>
        </div>
      )}
    </div>
  );
}
