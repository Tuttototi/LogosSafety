import { useState } from "react";
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  GraduationCap,
  Stethoscope,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import { getSeverityColor } from "@/lib/status-utils";
import { exportTableToExcel, downloadExcel } from "@/lib/excel/import";

const dayFilters = [
  { key: 30, label: "30 giorni" },
  { key: 60, label: "60 giorni" },
  { key: 90, label: "90 giorni" },
];

export default function Scadenziario() {
  const [days, setDays] = useState(90);

  const { data: scadenziario } = trpc.compliance.scadenziario.useQuery({ days });
  const { data: alerts } = trpc.compliance.alerts.useQuery({ resolved: false });

  const allDeadlines = [
    ...(scadenziario?.expiringCertificates ?? []),
    ...(scadenziario?.expiredCertificates ?? []),
    ...(scadenziario?.upcomingVisits ?? []),
  ].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getTypeIcon = (type: string) => {
    if (type.includes("formazione")) return GraduationCap;
    if (type.includes("visita")) return Stethoscope;
    return FileText;
  };

  const getTypeColor = (type: string) => {
    if (type.includes("formazione")) return "text-blue-600";
    if (type.includes("visita")) return "text-emerald-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Scadenziario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Scadenze formazione, visite mediche e alert
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {dayFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setDays(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === f.key
                    ? "bg-blue-700 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs ml-2"
            onClick={() => {
              if (!allDeadlines.length) return;
              const buf = exportTableToExcel(allDeadlines, "Scadenziario", {
                workerName: "Lavoratore", type: "Tipo", item: "Elemento",
                dueDate: "Scadenza", severity: "Severita", daysUntil: "Giorni Mancanti",
              });
              downloadExcel(buf, `scadenziario_${new Date().toISOString().split("T")[0]}.xlsx`);
            }}
            disabled={!allDeadlines.length}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Esporta
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold text-gray-900">{allDeadlines.length}</p>
                <p className="text-[10px] text-gray-500">Scadenze totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {(scadenziario?.expiringCertificates?.length ?? 0) +
                    (scadenziario?.expiredCertificates?.length ?? 0)}
                </p>
                <p className="text-[10px] text-gray-500">Formazione</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {scadenziario?.upcomingVisits?.length ?? 0}
                </p>
                <p className="text-[10px] text-gray-500">Visite mediche</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-lg font-bold text-red-600">
                  {scadenziario?.expiredCertificates?.length ?? 0}
                </p>
                <p className="text-[10px] text-gray-500">Scaduti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-lg font-bold text-amber-600">
                  {alerts?.filter((a) => !a.resolved).length ?? 0}
                </p>
                <p className="text-[10px] text-gray-500">Alert aperti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Deadlines Timeline */}
        <div className="flex-1">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Timeline scadenze
              </CardTitle>
            </CardHeader>
            <div className="border-t border-gray-200">
              {allDeadlines.map((item, idx) => {
                const Icon = getTypeIcon(item.type);
                const sev = getSeverityColor(item.severity);
                const daysLeft = item.dueDate
                  ? Math.ceil(
                      // Recalculate against the current time on every render.
                      // eslint-disable-next-line react-hooks/purity
                      (new Date(item.dueDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0;

                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* Date column */}
                    <div className="w-24 flex-shrink-0 text-right">
                      <p className="text-xs font-semibold text-gray-900">
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString("it-IT")
                          : "—"}
                      </p>
                      <p
                        className={`text-[10px] font-medium ${
                          daysLeft < 0
                            ? "text-red-500"
                            : daysLeft <= 30
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        {daysLeft < 0
                          ? `${Math.abs(daysLeft)}gg fa`
                          : `${daysLeft}gg`}
                      </p>
                    </div>

                    {/* Line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          daysLeft < 0
                            ? "bg-red-500"
                            : daysLeft <= 30
                            ? "bg-amber-500"
                            : "bg-blue-400"
                        }`}
                      />
                      {idx < allDeadlines.length - 1 && (
                        <div className="w-px h-full bg-gray-200 mt-0.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${getTypeColor(item.type)}`} />
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.workerName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`${sev.bg} ${sev.text} border-0 text-[10px] flex-shrink-0`}
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                );
              })}

              {allDeadlines.length === 0 && (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessuna scadenza nel periodo</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alert List */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alert non risolti
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {alerts?.slice(0, 10).map((alert) => {
                  const sev = getSeverityColor(alert.severity);
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          alert.severity === "critica"
                            ? "bg-red-500"
                            : alert.severity === "alta"
                            ? "bg-orange-500"
                            : alert.severity === "media"
                            ? "bg-amber-500"
                            : "bg-blue-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {alert.worker
                            ? `${alert.worker.firstName} ${alert.worker.lastName}`
                            : "—"}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {alert.description}
                        </p>
                        {alert.dueDate && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(alert.dueDate).toLocaleDateString("it-IT")}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`${sev.bg} ${sev.text} border-0 text-[9px] flex-shrink-0`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  );
                })}
                {(!alerts || alerts.length === 0) && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Nessun alert aperto
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
