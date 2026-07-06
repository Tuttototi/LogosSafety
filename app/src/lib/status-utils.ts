export type StatusValue = "valido" | "in_scadenza" | "scaduto" | "mancante" | "non_richiesto" | "compliant" | "scadenza_vicina" | "non_conforme" | "da_verificare";

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    valido: "Valido",
    in_scadenza: "In scadenza",
    scaduto: "Scaduto",
    mancante: "Mancante",
    non_richiesto: "Non richiesto",
    compliant: "In regola",
    scadenza_vicina: "Scadenza vicina",
    non_conforme: "Non conforme",
    da_verificare: "Da verificare",
  };
  return labels[status] ?? status;
}

export function getStatusColorClasses(status: string): { bg: string; text: string; border?: string } {
  switch (status) {
    case "valido":
    case "compliant":
      return { bg: "bg-emerald-50", text: "text-emerald-700" };
    case "in_scadenza":
    case "scadenza_vicina":
    case "da_verificare":
      return { bg: "bg-amber-50", text: "text-amber-700" };
    case "scaduto":
    case "mancante":
    case "non_conforme":
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
    case "non_richiesto":
      return { bg: "bg-gray-100", text: "text-gray-500" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-500" };
  }
}

export function getOverallStatusColor(status: string): string {
  switch (status) {
    case "compliant":
      return "bg-emerald-500";
    case "scadenza_vicina":
    case "da_verificare":
      return "bg-amber-500";
    case "non_conforme":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

export function getDotColor(status: string): string {
  switch (status) {
    case "valido":
    case "compliant":
      return "bg-emerald-500";
    case "in_scadenza":
    case "scadenza_vicina":
      return "bg-amber-500";
    case "scaduto":
    case "mancante":
    case "non_conforme":
      return "bg-red-500";
    case "non_richiesto":
      return "bg-gray-300";
    default:
      return "bg-gray-300";
  }
}

export function getSeverityColor(severity: string): { bg: string; text: string } {
  switch (severity) {
    case "critica":
      return { bg: "bg-red-100", text: "text-red-700" };
    case "alta":
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case "media":
      return { bg: "bg-amber-100", text: "text-amber-700" };
    case "bassa":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600" };
  }
}

export function getRiskLevelColor(level: string): { bg: string; text: string } {
  switch (level) {
    case "basso":
      return { bg: "bg-emerald-100", text: "text-emerald-700" };
    case "medio":
      return { bg: "bg-amber-100", text: "text-amber-700" };
    case "alto":
      return { bg: "bg-red-100", text: "text-red-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600" };
  }
}

export function getVisitTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    preventiva: "Preventiva",
    preassuntiva: "Preassuntiva",
    periodica: "Periodica",
    cambio_mansione: "Cambio mansione",
    richiesta_lavoratore: "Richiesta lavoratore",
    rientro_malattia: "Rientro malattia",
    rientro_infortunio: "Rientro infortunio",
    cessazione: "Cessazione",
    straordinaria: "Straordinaria",
  };
  return labels[type] ?? type;
}

export function getJudgmentLabel(judgment: string): string {
  const labels: Record<string, string> = {
    idoneo: "Idoneo",
    idoneo_prescrizioni: "Idoneo con prescrizioni",
    idoneo_limitazioni: "Idoneo con limitazioni",
    temp_non_idoneo: "Temp. non idoneo",
    non_idoneo: "Non idoneo",
  };
  return labels[judgment] ?? judgment;
}

export function getJudgmentColor(judgment: string): { bg: string; text: string } {
  switch (judgment) {
    case "idoneo":
      return { bg: "bg-emerald-100", text: "text-emerald-700" };
    case "idoneo_prescrizioni":
    case "idoneo_limitazioni":
      return { bg: "bg-amber-100", text: "text-amber-700" };
    case "temp_non_idoneo":
    case "non_idoneo":
      return { bg: "bg-red-100", text: "text-red-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600" };
  }
}
