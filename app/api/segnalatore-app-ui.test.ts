import { describe, expect, it } from "vitest";
import {
  ATTACHMENTS_DISABLED_MESSAGE,
  CREATE_ERROR_MESSAGE,
  DEFAULT_CREATE_CATEGORY,
  DEFAULT_CREATE_TYPE,
  DETAIL_ERROR_MESSAGE,
  EMPTY_LIST_MESSAGE,
  LIST_ERROR_MESSAGE,
  OPERATIONAL_SCOPE_EMPTY_MESSAGE,
  OPERATIONAL_SCOPE_ERROR_MESSAGE,
  OPERATIONAL_SCOPE_LOADING_MESSAGE,
  WORKFLOW_ACTION_ERROR_MESSAGE,
  buildCreateSegnalazionePayload,
  formatOperationalScope,
  getOperationalScopeLoadState,
  getSingleOperationalScopeSelection,
  getFriendlySegnalazioniError,
  mapDetailToReport,
  mapListItemToReport,
  mapPriorityToSeverity,
} from "@/modules/segnalazioni/ui/mappers/segnalazioni-ui-mapper";
import type {
  AvailableOperationalScope,
  DraftReport,
  SegnalazioneDetailDto,
  SegnalazioniListItemDto,
} from "@/modules/segnalazioni/ui/types";

const listItem: SegnalazioniListItemDto = {
  id: "report-1",
  code: "SEG-2026-0001",
  title: "Parapetto instabile",
  priority: "Alta",
  severity: "Alta",
  status: "Nuova",
  category: "Sicurezza",
  type: "Pericolo",
  scope: {
    contractId: "contract-1",
    siteId: "site-1",
    plantId: "plant-1",
  },
  reporterDisplayName: "Mario Rossi",
  createdAt: "2026-07-11T10:00:00.000Z",
  updatedAt: "2026-07-11T11:00:00.000Z",
};

const availableScope: AvailableOperationalScope = {
  contracts: [{ id: "contract-1", code: "CTR-1", name: "Commessa 1", siteId: "site-1" }],
  sites: [{ id: "site-1", name: "Sede 1", contractId: "contract-1" }],
  plants: [{ id: "plant-1", name: "Impianto 1", siteId: "site-1", contractId: "contract-1" }],
  areas: [],
};

function makeDraft(overrides: Partial<DraftReport> = {}): DraftReport {
  return {
    contractId: "",
    siteId: "",
    plantId: "",
    areaId: "",
    title: "Titolo",
    description: "Descrizione sufficientemente lunga",
    priority: "Media",
    ...overrides,
  };
}

describe("SegnalatoreApp UI mapping", () => {
  it("maps backend list DTOs to visible report cards", () => {
    const report = mapListItemToReport(listItem);

    expect(report).toMatchObject({
      id: "report-1",
      code: "SEG-2026-0001",
      title: "Parapetto instabile",
      priority: "Alta",
      status: "Nuova",
      location: "Commessa contract-1 - Sede site-1 - Impianto plant-1",
      reporterDisplayName: "Mario Rossi",
    });
    expect(report.description).toBe("Apri il dettaglio per visualizzare la descrizione completa.");
  });

  it("renders backend status and priority without local visibility filtering fields", () => {
    const report = mapListItemToReport({ ...listItem, status: "Presa in carico", priority: "Critica" });

    expect(report.status).toBe("Presa in carico");
    expect(report.priority).toBe("Critica");
    expect(report).not.toHaveProperty("visibleTo");
  });

  it("maps backend detail DTOs to the selected report detail", () => {
    const detail: SegnalazioneDetailDto = {
      ...listItem,
      description: "Il parapetto del ponteggio oscilla.",
      comments: [{
        id: "comment-1",
        segnalazioneId: "report-1",
        testo: "Commento reale",
        autoreNome: "Mario Rossi",
        pubblico: true,
        createdAt: "2026-07-11T12:00:00.000Z",
      }],
      attachments: [],
      workflow: [],
      timeline: [{
        id: "created-report-1",
        type: "created",
        occurredAt: "2026-07-11T10:00:00.000Z",
        actorDisplayName: "Mario Rossi",
        actorRole: "segnalatore",
        newStatus: "Nuova",
        text: "Segnalazione creata",
      }],
      capabilities: {
        canComment: true,
        canTakeInCharge: true,
        canRequestIntegration: false,
        canIntegrate: false,
        canResolve: false,
        canClose: false,
        canAcknowledge: true,
        allowedStatusTransitions: ["Presa in carico"],
      },
      acknowledgement: { acknowledged: false },
    };

    const report = mapDetailToReport(detail);

    expect(report.description).toBe("Il parapetto del ponteggio oscilla.");
    expect(report.comments?.[0]?.testo).toBe("Commento reale");
    expect(report.timeline?.[0]?.type).toBe("created");
    expect(report.capabilities?.canTakeInCharge).toBe(true);
    expect(report.acknowledgement?.acknowledged).toBe(false);
  });

  it("uses backend actor scope when no operational scope is returned", () => {
    expect(formatOperationalScope(undefined)).toBe("Contesto operativo assegnato");
    expect(formatOperationalScope({})).toBe("Contesto operativo assegnato");
  });

  it("formats partial operational scopes without fake appalto labels", () => {
    expect(formatOperationalScope({ siteId: "site-2" })).toBe("Sede site-2");
    expect(formatOperationalScope({ plantId: "plant-2", areaId: "area-7" })).toBe("Impianto plant-2 - Area area-7");
  });

  it("builds create payload without tenant, company, reporter or role fields", () => {
    const draft: DraftReport = makeDraft({
      title: "  Transenna danneggiata  ",
      description: "  La transenna vicino alla baia di carico risulta instabile.  ",
      priority: "Media",
      contractId: "contract-1",
      siteId: "site-1",
    });

    const payload = buildCreateSegnalazionePayload(draft);

    expect(payload).toEqual({
      title: "Transenna danneggiata",
      description: "La transenna vicino alla baia di carico risulta instabile.",
      priority: "Media",
      severity: "Media",
      category: DEFAULT_CREATE_CATEGORY,
      type: DEFAULT_CREATE_TYPE,
      organizationalScope: {
        contractId: "contract-1",
        siteId: "site-1",
      },
    });
    expect(payload).not.toHaveProperty("tenantId");
    expect(payload).not.toHaveProperty("companyId");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("reporter");
    expect(payload).not.toHaveProperty("status");
  });

  it("trims create title and description before calling the API", () => {
    const payload = buildCreateSegnalazionePayload(makeDraft({
      title: "  Titolo reale  ",
      description: "  Descrizione reale della segnalazione  ",
      priority: "Bassa",
    }));

    expect(payload.title).toBe("Titolo reale");
    expect(payload.description).toBe("Descrizione reale della segnalazione");
  });

  it("does not include organization scope when no context is selected", () => {
    const payload = buildCreateSegnalazionePayload(makeDraft());

    expect(payload).not.toHaveProperty("organizationalScope");
  });

  it("includes only authorized operational ids selected by the user", () => {
    const payload = buildCreateSegnalazionePayload(makeDraft({
      contractId: "contract-1",
      plantId: "plant-1",
    }));

    expect(payload.organizationalScope).toEqual({
      contractId: "contract-1",
      plantId: "plant-1",
    });
    expect(payload.organizationalScope).not.toHaveProperty("tenantId");
    expect(payload.organizationalScope).not.toHaveProperty("companyId");
    expect(payload.organizationalScope).not.toHaveProperty("role");
  });

  it("derives initial severity from the selected priority", () => {
    expect(mapPriorityToSeverity("Bassa")).toBe("Bassa");
    expect(mapPriorityToSeverity("Critica")).toBe("Critica");
  });

  it("uses explicit domain defaults for category and type", () => {
    const payload = buildCreateSegnalazionePayload(makeDraft({
      title: "Titolo",
      description: "Descrizione sufficientemente lunga",
      priority: "Alta",
    }));

    expect(payload.category).toBe("Sicurezza");
    expect(payload.type).toBe("Pericolo");
  });

  it("preserves backend reporter display name only from DTO data", () => {
    const report = mapListItemToReport({ ...listItem, reporterDisplayName: undefined });

    expect(report.reporterDisplayName).toBeUndefined();
  });

  it("maps detail without exposing backend comments in list cards", () => {
    const report = mapListItemToReport(listItem);

    expect(report).not.toHaveProperty("comments");
    expect(report).not.toHaveProperty("attachments");
    expect(report).not.toHaveProperty("workflow");
  });

  it("keeps empty list text neutral", () => {
    expect(EMPTY_LIST_MESSAGE).toBe("Nessuna segnalazione disponibile");
  });

  it("keeps attachment upload disabled copy explicit", () => {
    expect(ATTACHMENTS_DISABLED_MESSAGE).toContain("prossimo aggiornamento");
  });

  it("maps operational scope loading empty error states", () => {
    expect(getOperationalScopeLoadState(true, false, undefined)).toBe("loading");
    expect(getOperationalScopeLoadState(false, true, undefined)).toBe("error");
    expect(getOperationalScopeLoadState(false, false, { contracts: [], sites: [], plants: [], areas: [] })).toBe("empty");
    expect(getOperationalScopeLoadState(false, false, availableScope)).toBe("ready");
  });

  it("preselects single available operational options", () => {
    expect(getSingleOperationalScopeSelection(availableScope)).toEqual({
      contractId: "contract-1",
      siteId: "site-1",
      plantId: "plant-1",
      areaId: undefined,
    });
  });

  it("keeps user-facing states and errors sanitized", () => {
    expect(getFriendlySegnalazioniError(CREATE_ERROR_MESSAGE)).toBe(CREATE_ERROR_MESSAGE);
    expect(LIST_ERROR_MESSAGE).toBe("Impossibile caricare le segnalazioni. Riprova.");
    expect(CREATE_ERROR_MESSAGE).toBe("Impossibile inviare la segnalazione. Riprova.");
    expect(DETAIL_ERROR_MESSAGE).toBe("Impossibile caricare il dettaglio. Riprova.");
    expect(EMPTY_LIST_MESSAGE).toBe("Nessuna segnalazione disponibile");
    expect(ATTACHMENTS_DISABLED_MESSAGE).toBe("Allegati disponibili in un prossimo aggiornamento.");
    expect(OPERATIONAL_SCOPE_LOADING_MESSAGE).toBe("Caricamento contesti operativi...");
    expect(OPERATIONAL_SCOPE_EMPTY_MESSAGE).toBe("Nessun appalto o impianto disponibile per il tuo profilo");
    expect(OPERATIONAL_SCOPE_ERROR_MESSAGE).toBe("Impossibile caricare i contesti operativi. Riprova.");
    expect(WORKFLOW_ACTION_ERROR_MESSAGE).toBe("Operazione non completata. Riprova.");
  });
});
