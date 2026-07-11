import type { DraftReport, SafetyCommunication, SegnalatoreRoleGroup } from "./types";

export const defaultDraft: DraftReport = {
  contractId: "",
  siteId: "",
  plantId: "",
  areaId: "",
  title: "",
  description: "",
  priority: "Media",
};

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
