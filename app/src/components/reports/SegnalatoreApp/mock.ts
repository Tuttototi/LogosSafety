import type { DraftReport, SafetyCommunication, SegnalatoreReport, SegnalatoreRoleGroup } from "./types";

export const defaultDraft: DraftReport = {
  location: "",
  title: "",
  description: "",
  priority: "Media",
};

// Mock temporanei: sostituire con API LogosSafety in sprint successivo.
export const mockReports: SegnalatoreReport[] = [
  {
    code: "SEG-2026-014",
    title: "Transenna danneggiata in area carico",
    status: "In carico",
    priority: "Alta",
    date: "08 lug 2026",
    location: "Appalto Milano - Impianto Nord",
    update: "Presa in carico dal team sicurezza",
    description: "La transenna vicino alla baia di carico risulta piegata e instabile.",
    visibleTo: ["operational", "manager", "safety"],
  },
  {
    code: "SEG-2026-012",
    title: "Richiesta integrazione foto DPI",
    status: "In attesa integrazione",
    priority: "Media",
    date: "07 lug 2026",
    location: "Commessa Torino - Linea 2",
    update: "Richiesta una foto aggiuntiva dell'area",
    description: "La segnalazione richiede una seconda foto per completare la verifica.",
    visibleTo: ["operational", "manager", "safety"],
  },
  {
    code: "SEG-2026-009",
    title: "Verifica passaggio pedonale interno",
    status: "Nuova",
    priority: "Bassa",
    date: "05 lug 2026",
    location: "Impianto Bologna",
    update: "In attesa di prima valutazione",
    description: "Il passaggio pedonale necessita di nuova segnaletica orizzontale.",
    visibleTo: ["manager", "safety"],
  },
  {
    code: "SEG-2026-006",
    title: "Chiusura intervento parapetto",
    status: "Chiusa",
    priority: "Alta",
    date: "02 lug 2026",
    location: "Appalto Roma - Copertura",
    update: "Intervento chiuso con evidenza allegata",
    description: "Il parapetto provvisorio e' stato sostituito con protezione certificata.",
    visibleTo: ["safety"],
  },
];

// Mock temporanei: sostituire con API Comunicazioni Sicurezza in sprint successivo.
export const mockCommunications: SafetyCommunication[] = [
  {
    id: "COM-2026-021",
    title: "Video briefing DPI per lavori in quota",
    type: "Video",
    status: "Da vedere",
    publishedAt: "09 lug 2026",
    acknowledgementDue: "16 lug 2026",
    description: "Richiamo operativo sulle verifiche preliminari e sull'uso corretto dei DPI anticaduta.",
  },
  {
    id: "COM-2026-018",
    title: "Circolare accessi area cantiere",
    type: "Circolare",
    status: "Vista",
    publishedAt: "08 lug 2026",
    acknowledgementDue: "12 lug 2026",
    description: "Aggiornamento sulle modalita' di accesso, registrazione visitatori e percorsi autorizzati.",
  },
  {
    id: "COM-2026-015",
    title: "Infografica procedura emergenza",
    type: "Infografica",
    status: "Presa visione",
    publishedAt: "05 lug 2026",
    description: "Schema visuale dei punti di raccolta e dei contatti da attivare in caso di emergenza.",
  },
  {
    id: "COM-2026-011",
    title: "Avviso manutenzione area deposito",
    type: "Avviso",
    status: "Da vedere",
    publishedAt: "02 lug 2026",
    acknowledgementDue: "10 lug 2026",
    description: "Comunicazione temporanea sulla chiusura parziale dell'area deposito durante la manutenzione.",
  },
];

export const roleGroups: Record<string, SegnalatoreRoleGroup> = {
  admin: "safety",
  rspp: "safety",
  responsabile_sicurezza: "safety",
  sicurezza: "safety",
  aspp: "safety",
  operatore_sicurezza: "safety",
  capo_area: "manager",
  capo_impianto: "manager",
  referente_commessa: "manager",
  segnalatore: "operational",
  dipendente: "operational",
  operatore: "operational",
};

export const roleLabels: Record<string, string> = {
  admin: "Amministratore",
  rspp: "RSPP",
  responsabile_sicurezza: "Responsabile sicurezza",
  sicurezza: "Sicurezza",
  aspp: "ASPP",
  operatore_sicurezza: "Operatore sicurezza",
  capo_area: "Capo area",
  capo_impianto: "Capo impianto",
  referente_commessa: "Referente commessa",
  segnalatore: "Segnalatore",
  dipendente: "Dipendente",
  operatore: "Operatore",
};

export const subtitles: Record<SegnalatoreRoleGroup, string> = {
  operational: "Inserisci nuove segnalazioni e segui gli aggiornamenti delle tue richieste.",
  manager: "Monitora le segnalazioni dei tuoi impianti e aggiungi commenti operativi.",
  safety: "Gestisci segnalazioni, prese in carico, richieste integrazione e chiusure.",
};

export const actionsByGroup: Record<SegnalatoreRoleGroup, string[]> = {
  operational: ["Visualizza", "Presa visione"],
  manager: ["Visualizza", "Commenta", "Presa visione"],
  safety: ["Visualizza", "Prendi in carico", "Richiedi integrazione", "Cambia stato", "Chiudi"],
};
