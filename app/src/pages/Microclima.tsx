import { useState, useMemo } from "react";
import {
  Thermometer,
  ThermometerSun,
  ThermometerSnowflake,
  MapPin,
  AlertTriangle,
  Bell,
  History,
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  Snowflake,
  Flame,
  Calendar,
  User,
  Mail,
  Smartphone,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ───────────────────────────────────────────────
// Tipi
// ───────────────────────────────────────────────

type StatoSede = "ok" | "attenzione" | "allerta" | "emergenza";
type TipoRischio = "caldo" | "freddo" | "nessuno";
type LivelloAllerta = "giallo" | "arancione" | "rosso";

interface MicroclimaSede {
  id: number;
  nome: string;
  citta: string;
  regione: string;
  lat: number;
  lon: number;
  temp: number;
  umidita: number;
  wbgt: number;
  stato: StatoSede;
  rischio: TipoRischio;
  allertaAttiva?: string;
  ultimoAggiornamento: string;
}

interface MicroclimaAllerta {
  id: number;
  sedeId: number;
  sedeNome: string;
  citta: string;
  tipo: "caldo" | "freddo";
  livello: LivelloAllerta;
  messaggio: string;
  dataInizio: string;
  dataFine?: string;
  responsabile: string;
  stato: "attiva" | "risolta";
}

interface StoricoAllerta {
  id: number;
  sedeNome: string;
  citta: string;
  tipo: "caldo" | "freddo";
  livello: LivelloAllerta;
  dataInizio: string;
  dataRisoluzione: string;
  azione: string;
  responsabile: string;
}

// ───────────────────────────────────────────────
// Dati mock
// ───────────────────────────────────────────────

const SEDI_MOCK: MicroclimaSede[] = [
  { id: 1, nome: "Sede Centrale", citta: "Milano", regione: "Lombardia", lat: 45.46, lon: 9.19, temp: 32.5, umidita: 65, wbgt: 29.8, stato: "allerta", rischio: "caldo", allertaAttiva: "Onda di calore — superata soglia WBGT 28°C", ultimoAggiornamento: "2025-06-17T14:30:00" },
  { id: 2, nome: "Stabilimento Nord", citta: "Torino", regione: "Piemonte", lat: 45.07, lon: 7.69, temp: 31.2, umidita: 58, wbgt: 28.5, stato: "allerta", rischio: "caldo", allertaAttiva: "Rischio caldo moderato", ultimoAggiornamento: "2025-06-17T14:15:00" },
  { id: 3, nome: "Magazzino Est", citta: "Bologna", regione: "Emilia-Romagna", lat: 44.49, lon: 11.34, temp: 33.8, umidita: 72, wbgt: 31.2, stato: "emergenza", rischio: "caldo", allertaAttiva: "Emergenza caldo — WBGT > 31°C", ultimoAggiornamento: "2025-06-17T14:45:00" },
  { id: 4, nome: "Centro Logistico", citta: "Verona", regione: "Veneto", lat: 45.44, lon: 10.99, temp: 30.5, umidita: 55, wbgt: 27.1, stato: "attenzione", rischio: "caldo", ultimoAggiornamento: "2025-06-17T14:00:00" },
  { id: 5, nome: "Uffici Amministrativi", citta: "Roma", regione: "Lazio", lat: 41.90, lon: 12.50, temp: 28.3, umidita: 48, wbgt: 25.4, stato: "ok", rischio: "nessuno", ultimoAggiornamento: "2025-06-17T13:30:00" },
  { id: 6, nome: "Stabilimento Sud", citta: "Napoli", regione: "Campania", lat: 40.85, lon: 14.27, temp: 34.1, umidita: 68, wbgt: 30.5, stato: "emergenza", rischio: "caldo", allertaAttiva: "Emergenza caldo — sospensione attività esterne", ultimoAggiornamento: "2025-06-17T14:50:00" },
  { id: 7, nome: "Centro Ricerca", citta: "Firenze", regione: "Toscana", lat: 43.77, lon: 11.25, temp: 29.7, umidita: 52, wbgt: 26.8, stato: "ok", rischio: "nessuno", ultimoAggiornamento: "2025-06-17T13:45:00" },
  { id: 8, nome: "Magazzino Alpino", citta: "Aosta", regione: "Valle d'Aosta", lat: 45.74, lon: 7.32, temp: -4.2, umidita: 78, wbgt: -5.8, stato: "allerta", rischio: "freddo", allertaAttiva: "Rischio freddo — temperature < -3°C", ultimoAggiornamento: "2025-06-17T14:20:00" },
  { id: 9, nome: "Stabilimento Tirreno", citta: "Livorno", regione: "Toscana", lat: 43.55, lon: 10.31, temp: 27.5, umidita: 60, wbgt: 25.1, stato: "ok", rischio: "nessuno", ultimoAggiornamento: "2025-06-17T13:15:00" },
  { id: 10, nome: "Centro Distribuzione", citta: "Bari", regione: "Puglia", lat: 41.12, lon: 16.87, temp: 31.8, umidita: 62, wbgt: 28.9, stato: "allerta", rischio: "caldo", allertaAttiva: "Rischio caldo — idratazione obbligatoria", ultimoAggiornamento: "2025-06-17T14:35:00" },
  { id: 11, nome: "Sede Sardegna", citta: "Cagliari", regione: "Sardegna", lat: 39.22, lon: 9.12, temp: 30.1, umidita: 55, wbgt: 27.3, stato: "attenzione", rischio: "caldo", ultimoAggiornamento: "2025-06-17T14:10:00" },
  { id: 12, nome: "Sede Sicilia", citta: "Palermo", regione: "Sicilia", lat: 38.12, lon: 13.36, temp: 35.2, umidita: 70, wbgt: 32.1, stato: "emergenza", rischio: "caldo", allertaAttiva: "Emergenza caldo — WBGT critico 32°C", ultimoAggiornamento: "2025-06-17T15:00:00" },
  { id: 13, nome: "Magazzino Montagna", citta: "Trento", regione: "Trentino", lat: 46.07, lon: 11.12, temp: -2.5, umidita: 82, wbgt: -4.1, stato: "attenzione", rischio: "freddo", ultimoAggiornamento: "2025-06-17T14:25:00" },
  { id: 14, nome: "Centro Servizi", citta: "Genova", regione: "Liguria", lat: 44.41, lon: 8.93, temp: 26.8, umidita: 70, wbgt: 25.6, stato: "ok", rischio: "nessuno", ultimoAggiornamento: "2025-06-17T13:20:00" },
  { id: 15, nome: "Stabilimento Adriatico", citta: "Ancona", regione: "Marche", lat: 43.62, lon: 13.51, temp: 28.9, umidita: 58, wbgt: 26.2, stato: "ok", rischio: "nessuno", ultimoAggiornamento: "2025-06-17T13:50:00" },
];

const ALLERTE_MOCK: MicroclimaAllerta[] = [
  { id: 1, sedeId: 3, sedeNome: "Magazzino Est", citta: "Bologna", tipo: "caldo", livello: "rosso", messaggio: "WBGT 31.2°C — sospendere attività all'aperto, idratazione obbligatoria ogni 15 min", dataInizio: "2025-06-17T12:00:00", responsabile: "Mario Rossi", stato: "attiva" },
  { id: 2, sedeId: 6, sedeNome: "Stabilimento Sud", citta: "Napoli", tipo: "caldo", livello: "rosso", messaggio: "WBGT 30.5°C — turni ridotti, DPI anticalore obbligatorio", dataInizio: "2025-06-17T11:30:00", responsabile: "Luigi Bianchi", stato: "attiva" },
  { id: 3, sedeId: 12, sedeNome: "Sede Sicilia", citta: "Palermo", tipo: "caldo", livello: "rosso", messaggio: "WBGT 32.1°C — emergenza caldo, controlli medici ogni ora", dataInizio: "2025-06-17T13:00:00", responsabile: "Giuseppe Verdi", stato: "attiva" },
  { id: 4, sedeId: 1, sedeNome: "Sede Centrale", citta: "Milano", tipo: "caldo", livello: "arancione", messaggio: "WBGT 29.8°C — aumentare pause, monitorare lavoratori > 55 anni", dataInizio: "2025-06-17T14:00:00", responsabile: "Mario Rossi", stato: "attiva" },
  { id: 5, sedeId: 8, sedeNome: "Magazzino Alpino", citta: "Aosta", tipo: "freddo", livello: "arancione", messaggio: "Temperatura -4.2°C — DPI invernale obbligatorio, pause riscaldo ogni 45 min", dataInizio: "2025-06-17T10:00:00", responsabile: "Anna Neri", stato: "attiva" },
  { id: 6, sedeId: 10, sedeNome: "Centro Distribuzione", citta: "Bari", tipo: "caldo", livello: "giallo", messaggio: "WBGT 28.9°C — idratazione obbligatoria, limitare esposizione solare", dataInizio: "2025-06-17T13:30:00", responsabile: "Paolo Gialli", stato: "attiva" },
];

const STORICO_MOCK: StoricoAllerta[] = [
  { id: 101, sedeNome: "Sede Centrale", citta: "Milano", tipo: "caldo", livello: "arancione", dataInizio: "2025-06-10T11:00:00", dataRisoluzione: "2025-06-10T18:30:00", azione: "Turni ridotti, idratazione obbligatoria, monitoraggio 30 min", responsabile: "Mario Rossi" },
  { id: 102, sedeNome: "Stabilimento Sud", citta: "Napoli", tipo: "caldo", livello: "rosso", dataInizio: "2025-06-12T09:00:00", dataRisoluzione: "2025-06-12T20:00:00", azione: "Sospensione attività esterne, turni notturni, controlli medici", responsabile: "Luigi Bianchi" },
  { id: 103, sedeNome: "Magazzino Alpino", citta: "Aosta", tipo: "freddo", livello: "giallo", dataInizio: "2025-06-08T06:00:00", dataRisoluzione: "2025-06-08T14:00:00", azione: "DPI invernale, pause riscaldo 30 min, limitazione attività esterne", responsabile: "Anna Neri" },
  { id: 104, sedeNome: "Sede Sicilia", citta: "Palermo", tipo: "caldo", livello: "rosso", dataInizio: "2025-06-14T10:00:00", dataRisoluzione: "2025-06-14T21:00:00", azione: "Emergenza caldo — sospensione totale, evacuazione area aperta", responsabile: "Giuseppe Verdi" },
  { id: 105, sedeNome: "Centro Distribuzione", citta: "Bari", tipo: "caldo", livello: "arancione", dataInizio: "2025-06-15T12:00:00", dataRisoluzione: "2025-06-15T19:00:00", azione: "Idratazione obbligatoria, turni ridotti, ombrelloni industriali", responsabile: "Paolo Gialli" },
  { id: 106, sedeNome: "Magazzino Est", citta: "Bologna", tipo: "caldo", livello: "arancione", dataInizio: "2025-06-11T13:00:00", dataRisoluzione: "2025-06-11T20:00:00", azione: "Aumento pause, ventilazione supplementare, controllo WBGT ogni 30 min", responsabile: "Mario Rossi" },
  { id: 107, sedeNome: "Stabilimento Nord", citta: "Torino", tipo: "caldo", livello: "giallo", dataInizio: "2025-06-09T14:00:00", dataRisoluzione: "2025-06-09T20:00:00", azione: "Idratazione, limitazione attività pesanti, informazione lavoratori", responsabile: "Luigi Bianchi" },
  { id: 108, sedeNome: "Magazzino Montagna", citta: "Trento", tipo: "freddo", livello: "giallo", dataInizio: "2025-06-07T05:00:00", dataRisoluzione: "2025-06-07T13:00:00", azione: "DPI invernale, pause riscaldo, monitoraggio temperatura corporea", responsabile: "Anna Neri" },
  { id: 109, sedeNome: "Sede Centrale", citta: "Milano", tipo: "caldo", livello: "giallo", dataInizio: "2025-06-05T15:00:00", dataRisoluzione: "2025-06-05T21:00:00", azione: "Informazione preventiva, idratazione, monitoraggio WBGT", responsabile: "Mario Rossi" },
  { id: 110, sedeNome: "Stabilimento Adriatico", citta: "Ancona", tipo: "caldo", livello: "giallo", dataInizio: "2025-06-06T11:00:00", dataRisoluzione: "2025-06-06T18:00:00", azione: "Aumento pause, ombreggiatura, informazione lavoratori", responsabile: "Paolo Gialli" },
];

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

const statoConfig: Record<StatoSede, { label: string; bg: string; text: string; dot: string }> = {
  ok: { label: "OK", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  attenzione: { label: "Attenzione", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  allerta: { label: "Allerta", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  emergenza: { label: "Emergenza", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const livelloConfig: Record<LivelloAllerta, { label: string; bg: string; text: string; border: string }> = {
  giallo: { label: "Giallo", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  arancione: { label: "Arancione", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  rosso: { label: "Rosso", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

// ───────────────────────────────────────────────
// Componente principale
// ───────────────────────────────────────────────

export default function Microclima() {
  const [search, setSearch] = useState("");
  const [filterRischio, setFilterRischio] = useState<"tutte" | "caldo" | "freddo" | "attive">("tutte");
  const [expandedAllerta, setExpandedAllerta] = useState<number | null>(null);

  // KPI
  const totalSedi = SEDI_MOCK.length;
  const allerteAttive = ALLERTE_MOCK.filter((a) => a.stato === "attiva").length;
  const rischioCaldo = SEDI_MOCK.filter((s) => s.rischio === "caldo" && (s.stato === "allerta" || s.stato === "emergenza")).length;
  const rischioFreddo = SEDI_MOCK.filter((s) => s.rischio === "freddo" && (s.stato === "allerta" || s.stato === "emergenza")).length;

  // Filtri sedi
  const sediFiltered = useMemo(() => {
    return SEDI_MOCK.filter((s) => {
      if (filterRischio === "caldo" && s.rischio !== "caldo") return false;
      if (filterRischio === "freddo" && s.rischio !== "freddo") return false;
      if (filterRischio === "attive" && s.stato === "ok") return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.nome.toLowerCase().includes(q) ||
          s.citta.toLowerCase().includes(q) ||
          s.regione.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, filterRischio]);

  // Allerte attive filtrate
  const allerteFiltered = useMemo(() => {
    if (filterRischio === "tutte" || filterRischio === "attive") return ALLERTE_MOCK.filter((a) => a.stato === "attiva");
    return ALLERTE_MOCK.filter((a) => a.stato === "attiva" && a.tipo === filterRischio);
  }, [filterRischio]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-blue-600" />
            Microclima Alert
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitoraggio rischio caldo, freddo e allerte operative per {totalSedi} sedi distribuite in Italia
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            OT23 Ready
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-[3px] border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalSedi}</p>
                <p className="text-xs text-gray-500 font-medium">Sedi monitorate</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-[3px] border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{allerteAttive}</p>
                <p className="text-xs text-gray-500 font-medium">Allerte attive</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-[3px] border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{rischioCaldo}</p>
                <p className="text-xs text-gray-500 font-medium">Rischio caldo</p>
              </div>
              <ThermometerSun className="w-8 h-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-[3px] border-l-cyan-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{rischioFreddo}</p>
                <p className="text-xs text-gray-500 font-medium">Rischio freddo</p>
              </div>
              <ThermometerSnowflake className="w-8 h-8 text-cyan-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri + Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca sede, città, regione..."
              className="pl-9 h-9 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["tutte", "caldo", "freddo", "attive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterRischio(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterRischio === f
                    ? "bg-blue-700 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f === "tutte" ? "Tutte" : f === "caldo" ? "Caldo" : f === "freddo" ? "Freddo" : "Attive"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <Filter className="w-3.5 h-3.5" />
            <span>{sediFiltered.length} sedi visualizzate</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonna sinistra — Sedi + Allerte */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Tabella Sedi */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Sedi monitorate
              </CardTitle>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[180px_120px_120px_80px_80px_90px_110px_140px_1fr] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-4 py-2.5">Sede</div>
                <div className="px-4 py-2.5">Città</div>
                <div className="px-4 py-2.5">Regione</div>
                <div className="px-4 py-2.5 text-center">Temp</div>
                <div className="px-4 py-2.5 text-center">Umid.</div>
                <div className="px-4 py-2.5 text-center">WBGT</div>
                <div className="px-4 py-2.5 text-center">Stato</div>
                <div className="px-4 py-2.5 text-center">Rischio</div>
                <div className="px-4 py-2.5">Allerta</div>
              </div>
              {sediFiltered.map((sede) => {
                const cfg = statoConfig[sede.stato];
                return (
                  <div
                    key={sede.id}
                    className="min-w-[900px] grid grid-cols-[180px_120px_120px_80px_80px_90px_110px_140px_1fr] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{sede.nome}</p>
                      <p className="text-[10px] text-gray-400">Agg. {formatTime(sede.ultimoAggiornamento)}</p>
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-600 flex items-center">{sede.citta}</div>
                    <div className="px-4 py-3 text-xs text-gray-600 flex items-center">{sede.regione}</div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <span className={`text-xs font-semibold ${sede.temp > 30 ? "text-red-600" : sede.temp < 0 ? "text-cyan-600" : "text-gray-700"}`}>
                        {sede.temp}°C
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <span className="text-xs text-gray-600">{sede.umidita}%</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <span className={`text-xs font-semibold ${sede.wbgt > 28 ? "text-red-600" : sede.wbgt > 26 ? "text-amber-600" : "text-gray-700"}`}>
                        {sede.wbgt}°C
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 text-[10px] flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      {sede.rischio === "caldo" ? (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <Flame className="w-3 h-3" /> Caldo
                        </span>
                      ) : sede.rischio === "freddo" ? (
                        <span className="flex items-center gap-1 text-xs text-cyan-600">
                          <Snowflake className="w-3 h-3" /> Freddo
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-600 truncate" title={sede.allertaAttiva}>
                      {sede.allertaAttiva || "—"}
                    </div>
                  </div>
                );
              })}
              {sediFiltered.length === 0 && (
                <div className="py-12 text-center">
                  <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessuna sede trovata</p>
                </div>
              )}
            </div>
          </Card>

          {/* Allerte Attive */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Allerte attive ({allerteFiltered.length})
              </CardTitle>
            </CardHeader>
            <div className="border-t border-gray-200">
              {allerteFiltered.map((allerta) => {
                const cfg = livelloConfig[allerta.livello];
                const isExpanded = expandedAllerta === allerta.id;
                return (
                  <div key={allerta.id} className="border-b border-gray-100 last:border-0">
                    <div
                      className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedAllerta(isExpanded ? null : allerta.id)}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        {allerta.tipo === "caldo" ? (
                          <Flame className={`w-5 h-5 ${cfg.text}`} />
                        ) : (
                          <Snowflake className={`w-5 h-5 ${cfg.text}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{allerta.sedeNome}</p>
                          <Badge variant="outline" className={`${cfg.bg} ${cfg.text} ${cfg.border} text-[10px]`}>
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-gray-400">{allerta.citta}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{allerta.messaggio}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Inizio: {formatDateTime(allerta.dataInizio)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {allerta.responsabile}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">Azioni richieste:</p>
                          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                            <li>Verificare condizioni operative della sede</li>
                            <li>Contattare il responsabile di sede</li>
                            <li>Documentare intervento nel registro OT23</li>
                            <li>Aggiornare stato allerta entro 2 ore</li>
                          </ul>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Segna risolta
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              <FileText className="w-3 h-3 mr-1" /> Documenta OT23
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {allerteFiltered.length === 0 && (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nessuna allerta attiva</p>
                </div>
              )}
            </div>
          </Card>

          {/* Storico Allerte */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                Storico allerte
              </CardTitle>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-[140px_120px_80px_100px_140px_140px_1fr_120px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-4 py-2.5">Sede</div>
                <div className="px-4 py-2.5">Città</div>
                <div className="px-4 py-2.5 text-center">Tipo</div>
                <div className="px-4 py-2.5 text-center">Livello</div>
                <div className="px-4 py-2.5">Inizio</div>
                <div className="px-4 py-2.5">Risoluzione</div>
                <div className="px-4 py-2.5">Azione</div>
                <div className="px-4 py-2.5">Responsabile</div>
              </div>
              {STORICO_MOCK.map((s) => {
                const cfg = livelloConfig[s.livello];
                return (
                  <div
                    key={s.id}
                    className="min-w-[800px] grid grid-cols-[140px_120px_80px_100px_140px_140px_1fr_120px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-3 text-sm font-medium text-gray-900">{s.sedeNome}</div>
                    <div className="px-4 py-3 text-xs text-gray-600">{s.citta}</div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      {s.tipo === "caldo" ? (
                        <Flame className="w-4 h-4 text-red-500" />
                      ) : (
                        <Snowflake className="w-4 h-4 text-cyan-500" />
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      <Badge variant="outline" className={`${cfg.bg} ${cfg.text} ${cfg.border} text-[10px]`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-600">{formatDate(s.dataInizio)}</div>
                    <div className="px-4 py-3 text-xs text-gray-600">{formatDate(s.dataRisoluzione)}</div>
                    <div className="px-4 py-3 text-xs text-gray-600 truncate" title={s.azione}>{s.azione}</div>
                    <div className="px-4 py-3 text-xs text-gray-600">{s.responsabile}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Colonna destra — Notifiche & OT23 */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Riepilogo rischi */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Riepilogo rischi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-red-50">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-gray-700">Rischio caldo</span>
                </div>
                <span className="text-sm font-bold text-red-600">{rischioCaldo}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-cyan-50">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-medium text-gray-700">Rischio freddo</span>
                </div>
                <span className="text-sm font-bold text-cyan-600">{rischioFreddo}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-gray-700">Sedi in regola</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {SEDI_MOCK.filter((s) => s.stato === "ok").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-700">Da monitorare</span>
                </div>
                <span className="text-sm font-bold text-amber-600">
                  {SEDI_MOCK.filter((s) => s.stato === "attenzione").length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notifiche future */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-500" />
                Notifiche configurate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              <div className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-gray-50 transition-colors">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">Email responsabili</p>
                  <p className="text-[10px] text-gray-500">Allerta caldo ≥ giallo</p>
                </div>
                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-0 flex-shrink-0">Attivo</Badge>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-gray-50 transition-colors">
                <Smartphone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">Push operatori</p>
                  <p className="text-[10px] text-gray-500">Allerta caldo ≥ arancione</p>
                </div>
                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-0 flex-shrink-0">Attivo</Badge>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-gray-50 transition-colors">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">Email RLS/RSPP</p>
                  <p className="text-[10px] text-gray-500">Emergenza caldo / freddo</p>
                </div>
                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-0 flex-shrink-0">Attivo</Badge>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-gray-50 transition-colors">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">Report giornaliero</p>
                  <p className="text-[10px] text-gray-500">08:00 — riepilogo sedi</p>
                </div>
                <Badge variant="outline" className="text-[9px] bg-gray-50 text-gray-500 border-0 flex-shrink-0">Bozza</Badge>
              </div>
            </CardContent>
          </Card>

          {/* OT23 Tracciabilità */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                Tracciabilità OT23
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-800 mb-1">Valore OT23</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Intervento 4.1.A — Adozione di procedure e sistemi di gestione per il controllo del rischio climatico.
                  Monitoraggio WBGT, allerte caldo/freddo, notifiche ai responsabili.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Allerte documentate</span>
                  <span className="font-semibold text-gray-900">{STORICO_MOCK.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Sedi coperte</span>
                  <span className="font-semibold text-gray-900">{totalSedi}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Responsabili coinvolti</span>
                  <span className="font-semibold text-gray-900">4</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Ultimo aggiornamento</span>
                  <span className="font-semibold text-gray-900">17/06/2025</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs mt-1">
                <FileText className="w-3 h-3 mr-1" /> Esporta report OT23
              </Button>
            </CardContent>
          </Card>

          {/* Legenda WBGT */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-gray-500" />
                Legenda WBGT
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-gray-600">&lt; 26°C — OK</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-gray-600">26-28°C — Attenzione</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-gray-600">28-31°C — Allerta</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-gray-600">&gt; 31°C — Emergenza</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                Indice WBGT (Wet Bulb Globe Temperature): temperatura globale ponderata
                che considera temperatura aria, umidità e irraggiamento solare.
                Riferimento: D.Lgs. 81/2008 e linee guida INAIL.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
