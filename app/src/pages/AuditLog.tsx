import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, Filter, Calendar, User, ArrowRightLeft } from "lucide-react";

const actionLabels: Record<string, string> = {
  create: "Creazione", update: "Modifica", delete: "Eliminazione",
  view: "Visualizzazione", login: "Login", logout: "Logout",
  import: "Importazione", export: "Esportazione", upload: "Upload",
  download: "Download", approve: "Approvazione", reject: "Rifiuto",
};
const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700", update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700", view: "bg-gray-100 text-gray-600",
  login: "bg-purple-50 text-purple-700", logout: "bg-gray-100 text-gray-500",
  import: "bg-amber-50 text-amber-700", export: "bg-cyan-50 text-cyan-700",
  upload: "bg-orange-50 text-orange-700", download: "bg-indigo-50 text-indigo-700",
  approve: "bg-green-50 text-green-700", reject: "bg-red-50 text-red-700",
};
const moduleLabels: Record<string, string> = {
  dipendenti: "Dipendenti", formazione: "Formazione", sorveglianza: "Sorveglianza",
  documenti: "Documenti", impostazioni: "Impostazioni", compliance: "Compliance",
  branding: "Branding",
};

export default function AuditLog() {
  const [action, setAction] = useState<string | undefined>();
  const [module, setModule] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs, isLoading } = trpc.audit.list.useQuery({
    action, module,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Tracciamento operazioni: chi ha fatto cosa, quando e perché
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filtri:</span>
            </div>
            <Select value={action ?? "all_actions"} onValueChange={(v) => setAction(v === "all_actions" ? undefined : v)}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Azione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_actions">Tutte</SelectItem>
                {Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={module ?? "all_modules"} onValueChange={(v) => setModule(v === "all_modules" ? undefined : v)}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Modulo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_modules">Tutti</SelectItem>
                {Object.entries(moduleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-32" />
            </div>
            <div className="flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Eventi ({logs?.length ?? 0} risultati)
          </CardTitle>
        </CardHeader>
        <div className="border-t border-gray-200 overflow-x-auto">
          {/* Header */}
          <div className="min-w-[900px] grid grid-cols-[140px_100px_100px_120px_120px_1fr_1fr] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="px-4 py-2.5">Data/Ora</div>
            <div className="px-4 py-2.5">Utente</div>
            <div className="px-4 py-2.5">Ruolo</div>
            <div className="px-4 py-2.5">Azione</div>
            <div className="px-4 py-2.5">Modulo</div>
            <div className="px-4 py-2.5">Entità</div>
            <div className="px-4 py-2.5">Dettaglio</div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center"><Loader2 className="w-8 h-8 text-gray-300 mx-auto animate-spin" /><p className="text-sm text-gray-500 mt-2">Caricamento...</p></div>
          ) : (
            logs?.map((log) => {
              const aColor = actionColors[log.action] ?? "bg-gray-100 text-gray-600";
              return (
                <div key={log.id} className="min-w-[900px] grid grid-cols-[140px_100px_100px_120px_120px_1fr_1fr] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-900">
                      {log.createdAt ? new Date(log.createdAt).toLocaleDateString("it-IT") : "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-xs text-gray-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      {log.userName ?? "Sistema"}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-[10px] text-gray-500">{log.userRole}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <Badge variant="outline" className={`${aColor} border-0 text-[10px]`}>
                      {actionLabels[log.action] ?? log.action}
                    </Badge>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-xs text-gray-600">
                      {moduleLabels[log.module ?? ""] ?? log.module ?? "—"}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-700">{log.entityType}</p>
                    {log.entityName && <p className="text-[10px] text-gray-500 truncate">{log.entityName}</p>}
                  </div>
                  <div className="px-4 py-3">
                    {log.fieldName && (
                      <p className="text-[10px] text-gray-500">Campo: {log.fieldName}</p>
                    )}
                    {(log.oldValue || log.newValue) && (
                      <div className="mt-1 space-y-0.5">
                        {log.oldValue && (
                          <p className="text-[10px] text-red-600 line-through truncate" title={log.oldValue}>
                            {log.oldValue}
                          </p>
                        )}
                        {log.newValue && (
                          <p className="text-[10px] text-emerald-600 truncate" title={log.newValue}>
                            {log.newValue}
                          </p>
                        )}
                      </div>
                    )}
                    {log.reason && (
                      <p className="text-[10px] text-gray-400 mt-1">Motivo: {log.reason}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {!isLoading && logs?.length === 0 && (
            <div className="py-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nessun evento trovato</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
