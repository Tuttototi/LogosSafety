import {
  Briefcase,
  GraduationCap,
  Stethoscope,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import { getRiskLevelColor } from "@/lib/status-utils";

export default function Mansioni() {
  const { data: jobRoles } = trpc.settings.jobRoles.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mansioni, rischi e formazione</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Associazione mansioni, rischi, formazione obbligatoria e requisiti visita medica
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{jobRoles?.length ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium">Mansioni configurate</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {jobRoles?.filter((r) => r.riskLevel === "alto").length ?? 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Rischio alto</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {jobRoles?.filter((r) => r.requiresMedicalVisit).length ?? 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Con visita obbligatoria</p>
              </div>
              <Stethoscope className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {jobRoles?.reduce(
                    (acc, r) => acc + (r.jobRoleTraining?.length ?? 0),
                    0
                  ) ?? 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Formazioni associate</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" />
            Matrice Mansioni / Rischi / Formazione
          </CardTitle>
        </CardHeader>
        <div className="border-t border-gray-200 overflow-x-auto">
          {/* Header */}
          <div className="min-w-[900px] grid grid-cols-[180px_100px_1fr_1fr_100px_80px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="px-4 py-2.5">Mansione</div>
            <div className="px-4 py-2.5">Rischio</div>
            <div className="px-4 py-2.5">Rischi associati</div>
            <div className="px-4 py-2.5">Formazione richiesta</div>
            <div className="px-4 py-2.5 text-center">Visita medica</div>
            <div className="px-4 py-2.5 text-center">Dipendenti</div>
          </div>

          {jobRoles?.map((role) => {
            const riskColors = getRiskLevelColor(role.riskLevel);
            return (
              <div
                key={role.id}
                className="min-w-[900px] grid grid-cols-[180px_100px_1fr_1fr_100px_80px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{role.name}</p>
                  <p className="text-[10px] text-gray-500">{role.description}</p>
                </div>
                <div className="px-4 py-3 flex items-center">
                  <Badge
                    variant="outline"
                    className={`${riskColors.bg} ${riskColors.text} border-0 text-[10px]`}
                  >
                    {role.riskLevel}
                  </Badge>
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.jobRoleRisks?.slice(0, 3).map((jrr) => (
                      <Badge
                        key={jrr.id}
                        variant="outline"
                        className="text-[9px] bg-gray-50 text-gray-600"
                      >
                        {jrr.risk?.name}
                      </Badge>
                    ))}
                    {(role.jobRoleRisks?.length ?? 0) > 3 && (
                      <span className="text-[9px] text-gray-400">
                        +{(role.jobRoleRisks!.length - 3)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.jobRoleTraining?.map((jrt) => (
                      <Badge
                        key={jrt.id}
                        variant="outline"
                        className="text-[9px] bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {jrt.trainingType?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  {role.requiresMedicalVisit ? (
                    <Stethoscope className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {/* This would need a count query */}-
                  </span>
                </div>
              </div>
            );
          })}

          {jobRoles?.length === 0 && (
            <div className="py-12 text-center">
              <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nessuna mansione configurata</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
