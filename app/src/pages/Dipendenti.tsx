import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  ChevronRight,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  Stethoscope,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import {
  getDotColor,
  getRiskLevelColor,
} from "@/lib/status-utils";
import { exportTableToExcel, downloadExcel } from "@/lib/excel/import";

type WorkerStatus = "attivo" | "cessato" | "sospeso";

export default function Dipendenti() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkerStatus | undefined>();
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);

  const { data: workers } = trpc.workers.list.useQuery({
    search: search || undefined,
    status: statusFilter,
  });

  const { data: workerDetail } = trpc.workers.getById.useQuery(
    { id: selectedWorker! },
    { enabled: !!selectedWorker }
  );

  const statusCounts = useMemo(() => {
    const counts = { attivo: 0, cessato: 0, sospeso: 0 };
    workers?.forEach((w) => {
      if (w.status in counts) counts[w.status as WorkerStatus]++;
    });
    return counts;
  }, [workers]);

  const getWorkerTrainingSummary = () => {
    return { total: 3, valid: 0, expired: 0, expiring: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Anagrafica lavoratori</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestione dipendenti, stato formazione e sorveglianza sanitaria
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              if (!workers?.length) return;
              const buf = exportTableToExcel(workers, "Dipendenti", {
                lastName: "Cognome", firstName: "Nome", fiscalCode: "Codice Fiscale",
                birthDate: "Data Nascita", jobRoleName: "Mansione", companyName: "Azienda",
                siteName: "Sede", hireDate: "Data Assunzione", status: "Stato",
                email: "Email", phone: "Telefono",
              });
              downloadExcel(buf, `dipendenti_${new Date().toISOString().split("T")[0]}.xlsx`);
            }}
            disabled={!workers?.length}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Esporta
          </Button>
          <Button size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Aggiungi dipendente
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca dipendente..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["attivo", "sospeso", "cessato"] as WorkerStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-blue-700 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">({statusCounts[s]})</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Worker List */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers?.map((worker) => {
              const summary = getWorkerTrainingSummary();
              const riskColors = getRiskLevelColor(worker.jobRole?.riskLevel ?? "basso");
              const isNonCompliant = summary.expired > 0 || worker.status === "sospeso";

              return (
                <Card
                  key={worker.id}
                  className={`shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedWorker === worker.id ? "ring-2 ring-blue-500" : ""
                  } ${isNonCompliant ? "border-l-[3px] border-l-red-400" : ""}`}
                  onClick={() => setSelectedWorker(worker.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {worker.firstName[0]}{worker.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {worker.firstName} {worker.lastName}
                          </p>
                          {worker.status === "sospeso" && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Sospeso
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Briefcase className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{worker.jobRole?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">{worker.company?.name}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${riskColors.bg} ${riskColors.text}`}
                          >
                            Rischio {worker.jobRole?.riskLevel}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-gray-400" />
                            <span className={`text-xs font-medium ${
                              summary.expired > 0 ? "text-red-600" : summary.expiring > 0 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {summary.valid}/{summary.total}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {workers?.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nessun dipendente trovato</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {workerDetail && (
          <div className="w-full lg:w-96 flex-shrink-0">
            <Card className="shadow-sm sticky top-20">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center text-lg font-semibold">
                    {workerDetail.firstName[0]}{workerDetail.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {workerDetail.firstName} {workerDetail.lastName}
                    </CardTitle>
                    <p className="text-xs text-gray-500">{workerDetail.fiscalCode}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{workerDetail.jobRole?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{workerDetail.company?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{workerDetail.site?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      Assunto: {workerDetail.hireDate ? new Date(workerDetail.hireDate).toLocaleDateString("it-IT") : "—"}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {workerDetail.status === "attivo" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Attivo
                    </Badge>
                  ) : workerDetail.status === "sospeso" ? (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                      <ShieldAlert className="w-3 h-3 mr-1" /> Sospeso
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600">
                      <Shield className="w-3 h-3 mr-1" /> Cessato
                    </Badge>
                  )}
                  {workerDetail.requiresMedicalVisit && (
                    <Badge variant="outline" className="text-[10px]">
                      <Stethoscope className="w-3 h-3 mr-1" /> Sorveglianza
                    </Badge>
                  )}
                </div>

                {/* Training */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Formazione
                  </h4>
                  <div className="space-y-1.5">
                    {workerDetail.trainingCertificates?.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${getDotColor(cert.validityStatus)} flex-shrink-0`} />
                          <span className="text-xs text-gray-700 truncate">
                            {cert.course?.trainingType?.name ?? "—"}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {cert.expiryDate
                            ? new Date(cert.expiryDate).toLocaleDateString("it-IT")
                            : "—"}
                        </span>
                      </div>
                    )) ?? <p className="text-xs text-gray-400">Nessun attestato</p>}
                  </div>
                </div>

                {/* Medical Visits */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> Visite mediche
                  </h4>
                  <div className="space-y-1.5">
                    {workerDetail.medicalVisits?.slice(0, 3).map((visit) => (
                      <div key={visit.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50">
                        <div className="min-w-0">
                          <span className="text-xs text-gray-700">
                            {visit.visitType.replace(/_/g, " ")}
                          </span>
                          <Badge variant="outline" className="ml-2 text-[9px]">
                            {visit.requestStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {visit.visitDate
                            ? new Date(visit.visitDate).toLocaleDateString("it-IT")
                            : "—"}
                        </span>
                      </div>
                    )) ?? <p className="text-xs text-gray-400">Nessuna visita</p>}
                  </div>
                </div>

                {/* Documents */}
                {/* Collegato al modulo Documenti */}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    Modifica
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    Richiedi visita
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
