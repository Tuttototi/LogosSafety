import { useState } from "react";
import {
  Stethoscope,
  Search,
  Calendar,
  UserCheck,
  AlertTriangle,
  Clock,
  Plus,
  ClipboardList,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  getVisitTypeLabel,
  getJudgmentLabel,
  getJudgmentColor,
} from "@/lib/status-utils";
import { exportTableToExcel, downloadExcel } from "@/lib/excel/import";

const HEALTH_DATA_EXPORT_ROLES = ["admin", "responsabile_sicurezza", "medico_competente"];

export default function Sorveglianza() {
  const { user } = useAuth();
  const canAccessClinicalData = user
    ? HEALTH_DATA_EXPORT_ROLES.includes(user.role)
    : false;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data: visits } = trpc.medical.list.useQuery(
    typeFilter ? { visitType: typeFilter as "periodica" | "preassuntiva" | "preventiva" } : undefined
  );
  const { data: clinicalVisits } = trpc.medical.clinicalList.useQuery(
    typeFilter
      ? {
          visitType: typeFilter as
            | "periodica"
            | "preassuntiva"
            | "preventiva",
        }
      : undefined,
    { enabled: canAccessClinicalData }
  );
  const { data: compliance } = trpc.compliance.scadenziario.useQuery();
  const clinicalByVisitId = new Map(
    clinicalVisits?.map(visit => [visit.id, visit]) ?? []
  );
  const tableGridClass = canAccessClinicalData
    ? "min-w-[900px] grid-cols-[1fr_120px_100px_120px_140px_100px_100px]"
    : "min-w-[680px] grid-cols-[1fr_140px_120px_120px_100px]";

  const filteredVisits = visits?.filter((v) =>
    search
      ? `${v.worker?.firstName} ${v.worker?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        v.visitType.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const visitTypeStats = {
    preventiva: visits?.filter((v) => v.visitType === "preventiva").length ?? 0,
    preassuntiva: visits?.filter((v) => v.visitType === "preassuntiva").length ?? 0,
    periodica: visits?.filter((v) => v.visitType === "periodica").length ?? 0,
    cambio_mansione: visits?.filter((v) => v.visitType === "cambio_mansione").length ?? 0,
    rientro: visits?.filter((v) => v.visitType === "rientro_malattia" || v.visitType === "rientro_infortunio").length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sorveglianza sanitaria</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canAccessClinicalData
              ? "Visite mediche, giudizi di idoneità e richieste"
              : "Richieste, stato e scadenze delle visite mediche"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              if (!clinicalVisits?.length || !canAccessClinicalData) return;
              const exportRows = clinicalVisits.map(visit => ({
                workerName: `${visit.worker?.firstName ?? ""} ${visit.worker?.lastName ?? ""}`.trim(),
                visitType: visit.visitType,
                doctorName: visit.doctorName,
                visitDate: visit.visitDate,
                nextVisitDue: visit.nextVisitDue,
                judgment: visit.judgment,
                limitationDescription: visit.limitationDescription,
                prescriptionDescription: visit.prescriptionDescription,
              }));
              const buf = exportTableToExcel(exportRows, "Visite Mediche", {
                workerName: "Lavoratore", visitType: "Tipo Visita", doctorName: "Medico",
                visitDate: "Data Visita", nextVisitDue: "Prossima Visita", judgment: "Giudizio",
                limitationDescription: "Limitazioni", prescriptionDescription: "Prescrizioni",
              });
              downloadExcel(buf, `visite_mediche_${new Date().toISOString().split("T")[0]}.xlsx`);
            }}
            disabled={!clinicalVisits?.length || !canAccessClinicalData}
            title={canAccessClinicalData ? "Esporta visite in Excel" : "Solo Admin, Resp. Sicurezza e Medico Competente possono esportare dati sanitari"}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Esporta
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Richiedi visita
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Preventive", value: visitTypeStats.preventiva, icon: ClipboardList },
          { label: "Preassuntive", value: visitTypeStats.preassuntiva, icon: UserCheck },
          { label: "Periodiche", value: visitTypeStats.periodica, icon: Calendar },
          { label: "Cambio mansione", value: visitTypeStats.cambio_mansione, icon: FileText },
          { label: "Rientri", value: visitTypeStats.rientro, icon: Clock },
          { label: "Visite scadute", value: compliance?.upcomingVisits?.filter((v) => v.severity === "critica").length ?? 0, icon: AlertTriangle, danger: true },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-5 h-5 ${stat.danger ? "text-red-500" : "text-blue-500"} opacity-60`} />
                <div>
                  <p className={`text-lg font-bold ${stat.danger ? "text-red-600" : "text-gray-900"}`}>{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Visits Table */}
        <div className="flex-1">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" />
                  Visite mediche
                </CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Cerca visita..."
                    className="pl-8 h-8 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {["preventiva", "preassuntiva", "periodica"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTypeFilter(typeFilter === s ? undefined : s)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        typeFilter === s
                          ? "bg-blue-700 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {getVisitTypeLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              {/* Header */}
              <div className={`${tableGridClass} grid bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider`}>
                <div className="px-4 py-2.5">Lavoratore</div>
                <div className="px-4 py-2.5">Tipo visita</div>
                <div className="px-4 py-2.5">Data visita</div>
                {canAccessClinicalData && (
                  <>
                    <div className="px-4 py-2.5">Medico</div>
                    <div className="px-4 py-2.5">Giudizio</div>
                  </>
                )}
                <div className="px-4 py-2.5 text-center">Prossima</div>
                <div className="px-4 py-2.5 text-center">Stato</div>
              </div>

              {filteredVisits?.map((visit) => {
                const clinicalVisit = clinicalByVisitId.get(visit.id);
                const judgmentColors = clinicalVisit?.judgment
                  ? getJudgmentColor(clinicalVisit.judgment)
                  : null;
                return (
                  <div
                    key={visit.id}
                    className={`${tableGridClass} grid border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors`}
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {visit.worker?.firstName} {visit.worker?.lastName}
                      </p>
                      <p className="text-[11px] text-gray-500">{visit.worker?.jobRole?.name}</p>
                    </div>
                    <div className="px-4 py-3 flex items-center">
                      <span className="text-xs text-gray-600">
                        {getVisitTypeLabel(visit.visitType)}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center text-xs text-gray-600">
                      {visit.visitDate
                        ? new Date(visit.visitDate).toLocaleDateString("it-IT")
                        : visit.scheduledDate
                        ? new Date(visit.scheduledDate).toLocaleDateString("it-IT")
                        : "—"}
                    </div>
                    {canAccessClinicalData && (
                      <>
                        <div className="px-4 py-3 flex items-center text-xs text-gray-600">
                          {clinicalVisit?.doctorName ?? "—"}
                        </div>
                        <div className="px-4 py-3 flex items-center">
                          {clinicalVisit?.judgment ? (
                            <Badge
                              variant="outline"
                              className={`${judgmentColors?.bg} ${judgmentColors?.text} border-0 text-[10px]`}
                            >
                              {getJudgmentLabel(clinicalVisit.judgment)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </>
                    )}
                    <div className="px-4 py-3 flex items-center justify-center text-xs text-gray-600">
                      {visit.nextVisitDue
                        ? new Date(visit.nextVisitDue).toLocaleDateString("it-IT")
                        : "—"}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          visit.requestStatus === "completata"
                            ? "bg-emerald-50 text-emerald-700"
                            : visit.requestStatus === "prenotata"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        } border-0`}
                      >
                        {visit.requestStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {filteredVisits?.length === 0 && (
                <div className="py-12 text-center">
                  <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessuna visita trovata</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Visit Deadlines */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Visite in scadenza
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {compliance?.upcomingVisits?.slice(0, 6).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{v.workerName}</p>
                      <p className="text-[10px] text-gray-500">{v.description}</p>
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium flex-shrink-0">
                      {v.dueDate ? new Date(v.dueDate).toLocaleDateString("it-IT") : "—"}
                    </span>
                  </div>
                ))}
                {(!compliance?.upcomingVisits || compliance.upcomingVisits.length === 0) && (
                  <p className="text-xs text-gray-500 text-center py-4">Nessuna scadenza</p>
                )}
              </div>
            </CardContent>
          </Card>

          {canAccessClinicalData && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Limitazioni in corso
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {clinicalVisits
                    ?.filter(
                      visit =>
                        visit.limitationDescription &&
                        visit.requestStatus === "completata"
                    )
                    .slice(0, 4)
                    .map(visit => (
                      <div
                        key={visit.id}
                        className="p-2.5 rounded-md bg-amber-50 border border-amber-100"
                      >
                        <p className="text-xs font-medium text-gray-900">
                          {visit.worker?.firstName} {visit.worker?.lastName}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {visit.limitationDescription}
                        </p>
                      </div>
                    ))}
                  {clinicalVisits?.filter(
                    visit => visit.limitationDescription
                  ).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">
                      Nessuna limitazione attiva
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
