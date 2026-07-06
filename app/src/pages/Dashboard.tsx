import { Link } from "react-router";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  FileText,
  ShieldCheck,
  ArrowRight,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";

const quickLinks = [
  { title: "Dipendenti", description: "Gestione personale e stato operativo", href: "/dipendenti", icon: Users, accent: "from-red-500 to-red-600" },
  { title: "Formazione", description: "Percorsi e certificazioni da monitorare", href: "/formazione", icon: BookOpen, accent: "from-amber-500 to-orange-500" },
  { title: "Scadenziario", description: "Controlli e richieste da completare", href: "/scadenziario", icon: Calendar, accent: "from-slate-700 to-slate-800" },
];

export default function Dashboard() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: deadlines } = trpc.dashboard.upcomingDeadlines.useQuery();

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-red-100 bg-gradient-to-br from-[#b91c1c] via-[#c2410c] to-[#dc2626] p-6 text-white shadow-[0_20px_60px_rgba(185,28,28,0.2)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100">
              Panoramica operativa
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Monitora sicurezza, formazione e conformità da un unico punto di vista.
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-50 sm:text-base">
              La dashboard presenta i dati essenziali per passare rapidamente dalle priorità operative ai dettagli da gestire.
            </p>
          </div>
          <Button variant="secondary" className="w-full bg-white/15 text-white hover:bg-white/20 sm:w-auto">
            Visualizza piano operativo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-[4px] border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats?.totalWorkers ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">Totale dipendenti</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[4px] border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats?.activeWorkers ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">Attivi</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[4px] border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{(stats?.expiringCertificates ?? 0) + (stats?.expiringCertificates ?? 0)}</p>
                <p className="mt-1 text-sm text-slate-500">Scadenze prossime</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[4px] border-l-red-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats?.expiredCertificates ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">Attestati scaduti</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Aree da seguire</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.title} to={item.href} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-200 hover:bg-white">
                    <div className={`inline-flex rounded-2xl bg-gradient-to-br ${item.accent} p-2 text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600">
                      Apri
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Stato operativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Controlli richiesti</p>
                    <p className="text-sm text-slate-500">Priorità operative da verificare</p>
                  </div>
                </div>
                <Badge className="bg-red-100 text-red-700">3</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Formazione da aggiornare</p>
                    <p className="text-sm text-slate-500">Percorsi non ancora completati</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700">5</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Documenti da revisionare</p>
                    <p className="text-sm text-slate-500">Contenuti in attesa di verifica</p>
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-700">2</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Scadenze prossime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines?.slice(0, 4).map((deadline) => (
              <div key={deadline.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{deadline.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{deadline.date}</p>
                </div>
              </div>
            ))}
            {!deadlines?.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                Nessuna scadenza imminente in questo momento.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
