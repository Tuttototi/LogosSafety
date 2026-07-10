import { describe, expect, it } from "vitest";
import type {
  SegnalazioneAttachmentRecord,
  SegnalazioneCommentRecord,
  SegnalazioneRecord,
  SegnalazioneWorkflowEventRecord,
} from "@db/schema";
import {
  mapAcknowledgementToInsert,
  mapAttachmentRowToDomain,
  mapCommentRowToDomain,
  mapSegnalazioneRowToDomain,
  mapSegnalazioneToInsert,
  mapSegnalazioneToUpdate,
  mapWorkflowEventRowToDomain,
  SegnalazioniPersistenceError,
} from "@/modules/segnalazioni/infrastructure/persistence";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoAllegato,
  TipoSegnalazione,
  type Segnalazione,
} from "@/modules/segnalazioni/domain";

const createdAt = "2026-07-10T09:00:00.000Z";
const updatedAt = "2026-07-10T10:00:00.000Z";
const createdAtDate = new Date(createdAt);
const updatedAtDate = new Date(updatedAt);

function makeSegnalazione(overrides: Partial<Segnalazione> = {}): Segnalazione {
  return {
    id: "segnalazione-1",
    code: "SEG-001",
    tenantId: "tenant-1",
    companyId: "company-1",
    reporter: {
      userId: "user-1",
      personId: "person-1",
      employeeId: "employee-1",
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario.rossi@example.test",
      companyId: "company-1",
      role: SegnalazioniRole.Segnalatore,
    },
    createdByUserId: "user-1",
    createdByPersonId: "person-1",
    organizationalScope: {
      tenantId: "tenant-1",
      companyId: "company-1",
      contractId: "contract-1",
      siteId: "site-1",
      plantId: "plant-1",
      areaId: "area-1",
    },
    title: "Parapetto non fissato",
    description: "Il parapetto del ponteggio non risulta fissato correttamente.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    assignedToUserId: "assignee-1",
    responsibleUserId: "responsible-1",
    attachments: [],
    comments: [],
    workflow: [],
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function makeSegnalazioneRow(overrides: Partial<SegnalazioneRecord> = {}): SegnalazioneRecord {
  return {
    id: "segnalazione-1",
    code: "SEG-001",
    tenantId: "tenant-1",
    companyId: "company-1",
    contractId: "contract-1",
    siteId: "site-1",
    plantId: "plant-1",
    areaId: "area-1",
    reporterUserId: "user-1",
    reporterPersonId: "person-1",
    reporterEmployeeId: "employee-1",
    reporterFirstName: "Mario",
    reporterLastName: "Rossi",
    reporterEmail: "mario.rossi@example.test",
    reporterCompanyId: "company-1",
    reporterRole: SegnalazioniRole.Segnalatore,
    createdByUserId: "user-1",
    createdByPersonId: "person-1",
    title: "Parapetto non fissato",
    description: "Il parapetto del ponteggio non risulta fissato correttamente.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    assignedToUserId: "assignee-1",
    responsibleUserId: "responsible-1",
    closedAt: null,
    deletedAt: null,
    deletedByUserId: null,
    createdAt: createdAtDate,
    updatedAt: updatedAtDate,
    ...overrides,
  };
}

describe("segnalazioni persistence mappers", () => {
  it("maps a domain aggregate into insert and update records", () => {
    const segnalazione = makeSegnalazione({
      closedAt: "2026-07-10T11:00:00.000Z",
      status: StatoSegnalazione.Chiusa,
    });

    const insert = mapSegnalazioneToInsert(segnalazione);
    const update = mapSegnalazioneToUpdate(segnalazione);

    expect(insert).toMatchObject({
      id: "segnalazione-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      reporterUserId: "user-1",
      reporterRole: SegnalazioniRole.Segnalatore,
      createdByUserId: "user-1",
      status: StatoSegnalazione.Chiusa,
      contractId: "contract-1",
      plantId: "plant-1",
    });
    expect(insert.createdAt).toEqual(new Date(createdAt));
    expect(insert.closedAt).toEqual(new Date("2026-07-10T11:00:00.000Z"));
    expect(update).toMatchObject({
      status: StatoSegnalazione.Chiusa,
      assignedToUserId: "assignee-1",
      responsibleUserId: "responsible-1",
    });
  });

  it("maps persisted rows back to the domain aggregate", () => {
    const attachmentRow: SegnalazioneAttachmentRecord = {
      id: "attachment-1",
      segnalazioneId: "segnalazione-1",
      commentId: null,
      comunicazioneId: null,
      tenantId: "tenant-1",
      companyId: "company-1",
      fileName: "foto.jpg",
      mimeType: "image/jpeg",
      fileSize: 1234,
      attachmentType: TipoAllegato.Foto,
      description: "Foto area",
      checksum: "sha256:test",
      storageKey: null,
      uploadedByUserId: "user-1",
      uploadedByName: "Mario Rossi",
      deletedAt: null,
      createdAt: createdAtDate,
    };
    const commentRow: SegnalazioneCommentRecord = {
      id: "comment-1",
      segnalazioneId: "segnalazione-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      authorUserId: "user-2",
      authorName: "Sara Bianchi",
      body: "Commento operativo",
      public: true,
      deletedAt: null,
      createdAt: createdAtDate,
      updatedAt: updatedAtDate,
    };
    const workflowRow: SegnalazioneWorkflowEventRecord = {
      id: "workflow-1",
      segnalazioneId: "segnalazione-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      eventType: "status_transition",
      fromStatus: StatoSegnalazione.Nuova,
      toStatus: StatoSegnalazione.PresaInCarico,
      actorUserId: "user-2",
      actorName: "Sara Bianchi",
      note: "Presa in carico",
      createdAt: updatedAtDate,
    };

    const attachment = mapAttachmentRowToDomain(attachmentRow);
    const comment = mapCommentRowToDomain(commentRow);
    const workflow = mapWorkflowEventRowToDomain(workflowRow);
    const segnalazione = mapSegnalazioneRowToDomain(makeSegnalazioneRow(), [attachment], [comment], [workflow]);

    expect(segnalazione).toMatchObject({
      id: "segnalazione-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      reporter: {
        userId: "user-1",
        role: SegnalazioniRole.Segnalatore,
      },
      organizationalScope: {
        contractId: "contract-1",
        siteId: "site-1",
        plantId: "plant-1",
        areaId: "area-1",
      },
      status: StatoSegnalazione.Nuova,
    });
    expect(segnalazione.attachments).toHaveLength(1);
    expect(segnalazione.comments?.[0]?.testo).toBe("Commento operativo");
    expect(segnalazione.workflow?.[0]?.statoA).toBe(StatoSegnalazione.PresaInCarico);
  });

  it("rejects unknown persisted enum values instead of leaking invalid domain data", () => {
    const invalidRow = {
      ...makeSegnalazioneRow(),
      status: "Sconosciuta",
    } as unknown as SegnalazioneRecord;

    expect(() => mapSegnalazioneRowToDomain(invalidRow)).toThrow(SegnalazioniPersistenceError);
  });

  it("maps acknowledgement records without backend side effects", () => {
    const insert = mapAcknowledgementToInsert({
      id: "ack-1",
      segnalazioneId: "segnalazione-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      userId: "user-1",
      personId: "person-1",
      acknowledgedAt: updatedAt,
    });

    expect(insert).toMatchObject({
      id: "ack-1",
      segnalazioneId: "segnalazione-1",
      tenantId: "tenant-1",
      userId: "user-1",
    });
    expect(insert.acknowledgedAt).toEqual(updatedAtDate);
  });
});
