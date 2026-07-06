import { useState } from "react";
import {
  GraduationCap,
  Search,
  Clock,
  Users,
  FileText,
  Award,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import { getDotColor } from "@/lib/status-utils";
import { exportTableToExcel, downloadExcel } from "@/lib/excel/import";

const courseStatusColors: Record<string, { bg: string; text: string }> = {
  programmato: { bg: "bg-blue-50", text: "text-blue-700" },
  in_corso: { bg: "bg-amber-50", text: "text-amber-700" },
  completato: { bg: "bg-emerald-50", text: "text-emerald-700" },
  annullato: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function Formazione() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: courses } = trpc.training.courses.useQuery(
    statusFilter ? { status: statusFilter as "programmato" | "in_corso" | "completato" | "annullato" } : undefined
  );
  const { data: certificates } = trpc.training.certificates.useQuery();
  const { data: types } = trpc.training.types.useQuery();

  const filteredCourses = courses?.filter((c) =>
    search
      ? c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.provider?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Formazione sicurezza</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Corsi, attestati e gestione formazione obbligatoria
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              if (!certificates?.length) return;
              const buf = exportTableToExcel(certificates, "Attestati", {
                workerName: "Lavoratore", courseTitle: "Corso", trainingTypeName: "Tipo",
                provider: "Ente Formatore", courseDate: "Data Corso", expiryDate: "Scadenza",
                certificateNumber: "N. Attestato", durationHours: "Ore", modality: "Modalita",
                validityStatus: "Stato",
              });
              downloadExcel(buf, `attestati_${new Date().toISOString().split("T")[0]}.xlsx`);
            }}
            disabled={!certificates?.length}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Esporta
          </Button>
          <Button size="sm" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Nuovo corso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses?.length ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium">Corsi totali</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{certificates?.length ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium">Attestati</p>
              </div>
              <Award className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {certificates?.filter((c) => c.validityStatus === "in_scadenza").length ?? 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">In scadenza</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {certificates?.filter((c) => c.validityStatus === "scaduto").length ?? 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Scaduti</p>
              </div>
              <FileText className="w-8 h-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Courses List */}
        <div className="flex-1">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                  Corsi
                </CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Cerca corso..."
                    className="pl-8 h-8 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {["programmato", "in_corso", "completato"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        statusFilter === s
                          ? "bg-blue-700 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {s === "programmato" ? "Programmato" : s === "in_corso" ? "In corso" : "Completato"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              {/* Header */}
              <div className="min-w-[700px] grid grid-cols-[1fr_140px_100px_80px_80px_100px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-4 py-2.5">Corso</div>
                <div className="px-4 py-2.5">Tipo</div>
                <div className="px-4 py-2.5">Data</div>
                <div className="px-4 py-2.5 text-center">Durata</div>
                <div className="px-4 py-2.5 text-center">Stato</div>
                <div className="px-4 py-2.5 text-center">Partecipanti</div>
              </div>

              {filteredCourses?.map((course) => {
                const statusColors = courseStatusColors[course.status] ?? courseStatusColors.programmato;
                return (
                  <div
                    key={course.id}
                    className="min-w-[700px] grid grid-cols-[1fr_140px_100px_80px_80px_100px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{course.title}</p>
                      <p className="text-[11px] text-gray-500">{course.provider}</p>
                    </div>
                    <div className="px-4 py-3 flex items-center">
                      <span className="text-xs text-gray-600">{course.trainingType?.name}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center text-xs text-gray-600">
                      {course.courseDate
                        ? new Date(course.courseDate).toLocaleDateString("it-IT")
                        : "—"}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <span className="text-xs text-gray-600">{course.durationHours}h</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <Badge
                        variant="outline"
                        className={`${statusColors.bg} ${statusColors.text} border-0 text-[10px]`}
                      >
                        {course.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.certificates?.length ?? 0}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredCourses?.length === 0 && (
                <div className="py-12 text-center">
                  <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessun corso trovato</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Certificates Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Ultimi attestati
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {certificates?.slice(0, 8).map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {cert.worker?.firstName} {cert.worker?.lastName}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {cert.course?.trainingType?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">
                          {cert.expiryDate
                            ? new Date(cert.expiryDate).toLocaleDateString("it-IT")
                            : "—"}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${getDotColor(cert.validityStatus)}`} />
                      </div>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Training Types */}
          <Card className="shadow-sm mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                Tipologie corsi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {types?.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-xs text-gray-700">{t.name}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {t.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
