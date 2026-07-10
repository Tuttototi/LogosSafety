import { describe, expect, it } from "vitest";
import {
  ApplicationErrorCode,
  createAcknowledgeSegnalazioneUseCase,
  createAddCommentUseCase,
  createChangeSegnalazioneStatusUseCase,
  createCloseSegnalazioneUseCase,
  createCreateSegnalazioneUseCase,
  createGetSegnalazioneByIdUseCase,
  createListVisibleSegnalazioniUseCase,
  createRequestIntegrationUseCase,
  createTakeInChargeSegnalazioneUseCase,
  type AcknowledgementRecord,
  type ApplicationActor,
  type ApplicationEvent,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type NotificationPort,
  type SegnalazioniRepository,
  type SegnalazioniUseCaseDependencies,
} from "@/modules/segnalazioni/application";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  type Commento,
  type OrganizationalScope,
  type Segnalazione,
} from "@/modules/segnalazioni/domain";

const baseScope: OrganizationalScope = {
  tenantId: "tenant-1",
  companyId: "company-1",
  contractId: "contract-1",
  siteId: "site-1",
  plantId: "plant-1",
  areaId: "area-1",
};

function makeActor(overrides: Partial<ApplicationActor> = {}): ApplicationActor {
  return {
    userId: "user-1",
    personId: "person-1",
    employeeId: "employee-1",
    firstName: "Mario",
    lastName: "Rossi",
    tenantId: baseScope.tenantId,
    companyId: baseScope.companyId,
    role: SegnalazioniRole.ResponsabileSicurezza,
    active: true,
    organizationalScope: baseScope,
    assignedScopes: [baseScope],
    ...overrides,
  };
}

function makeSegnalazione(overrides: Partial<Segnalazione> = {}): Segnalazione {
  return {
    id: "report-1",
    code: "SEG-001",
    tenantId: baseScope.tenantId,
    companyId: baseScope.companyId,
    reporter: {
      userId: "user-1",
      personId: "person-1",
      employeeId: "employee-1",
      firstName: "Mario",
      lastName: "Rossi",
      companyId: baseScope.companyId,
      role: SegnalazioniRole.Segnalatore,
    },
    createdByUserId: "user-1",
    createdByPersonId: "person-1",
    organizationalScope: baseScope,
    title: "Parapetto non fissato",
    description: "Il parapetto del ponteggio non risulta fissato correttamente.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    attachments: [],
    comments: [],
    workflow: [],
    createdAt: "2026-07-10T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
    ...overrides,
  };
}

class FakeSegnalazioniRepository implements SegnalazioniRepository {
  readonly reports = new Map<string, Segnalazione>();
  readonly comments: Commento[] = [];
  readonly acknowledgements: AcknowledgementRecord[] = [];

  async findById(id: string, tenantId?: string): Promise<Segnalazione | null> {
    const report = this.reports.get(id) ?? null;
    if (!report || (tenantId && report.tenantId !== tenantId)) return null;
    return report;
  }

  async listVisibleByScope(): Promise<Segnalazione[]> {
    return [...this.reports.values()];
  }

  async create(segnalazione: Segnalazione): Promise<void> {
    this.reports.set(segnalazione.id, segnalazione);
  }

  async update(segnalazione: Segnalazione): Promise<void> {
    this.reports.set(segnalazione.id, segnalazione);
  }

  async addComment(comment: Commento): Promise<void> {
    this.comments.push(comment);
  }

  async saveAcknowledgement(acknowledgement: AcknowledgementRecord): Promise<void> {
    this.acknowledgements.push(acknowledgement);
  }

  async hasAcknowledgement(segnalazioneId: string, userId: string, tenantId?: string): Promise<boolean> {
    return this.acknowledgements.some(
      (acknowledgement) =>
        acknowledgement.segnalazioneId === segnalazioneId &&
        acknowledgement.userId === userId &&
        (!tenantId || acknowledgement.tenantId === tenantId),
    );
  }

  async existsByCode(code: string, tenantId?: string): Promise<boolean> {
    return [...this.reports.values()].some(
      (segnalazione) => segnalazione.code === code && (!tenantId || segnalazione.tenantId === tenantId),
    );
  }
}

class FakeAuditPort implements AuditPort {
  readonly events: ApplicationEvent[] = [];

  async record(event: ApplicationEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeNotificationPort implements NotificationPort {
  readonly events: ApplicationEvent[] = [];

  async notify(event: ApplicationEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeClockPort implements ClockPort {
  now(): string {
    return "2026-07-10T10:00:00.000Z";
  }
}

class FakeIdGeneratorPort implements IdGeneratorPort {
  private idCounter = 0;
  private codeCounter = 0;

  nextId(entity = "id"): string {
    this.idCounter += 1;
    return `${entity}-${this.idCounter}`;
  }

  nextCode(prefix = "SEG"): string {
    this.codeCounter += 1;
    return `${prefix}-${String(this.codeCounter).padStart(3, "0")}`;
  }
}

function makeDeps(initialReports: Segnalazione[] = []): SegnalazioniUseCaseDependencies & {
  repository: FakeSegnalazioniRepository;
  audit: FakeAuditPort;
  notification: FakeNotificationPort;
} {
  const repository = new FakeSegnalazioniRepository();
  for (const report of initialReports) {
    repository.reports.set(report.id, report);
  }

  return {
    repository,
    audit: new FakeAuditPort(),
    notification: new FakeNotificationPort(),
    clock: new FakeClockPort(),
    ids: new FakeIdGeneratorPort(),
  };
}

describe("segnalazioni application use cases", () => {
  it("creates a valid segnalazione", async () => {
    const deps = makeDeps();
    const useCase = createCreateSegnalazioneUseCase(deps);
    const actor = makeActor({ role: SegnalazioniRole.Segnalatore });

    const result = await useCase({
      actor,
      title: "Parapetto instabile",
      description: "Il parapetto al piano 2 oscilla.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: baseScope,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(StatoSegnalazione.Nuova);
      expect(deps.repository.reports.has(result.data.id)).toBe(true);
      expect(deps.audit.events).toHaveLength(1);
      expect(deps.notification.events).toHaveLength(1);
    }
  });

  it("blocks creation for inactive users", async () => {
    const deps = makeDeps();
    const result = await createCreateSegnalazioneUseCase(deps)({
      actor: makeActor({ active: false }),
      title: "Titolo",
      description: "Descrizione",
      priority: PrioritaSegnalazione.Media,
      severity: GravitaSegnalazione.Media,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: baseScope,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.InactiveUser);
  });

  it("blocks creation without tenant or company", async () => {
    const deps = makeDeps();
    const result = await createCreateSegnalazioneUseCase(deps)({
      actor: makeActor({
        tenantId: "",
        companyId: "",
        organizationalScope: { ...baseScope, tenantId: "", companyId: "" },
      }),
      title: "Titolo",
      description: "Descrizione",
      priority: PrioritaSegnalazione.Media,
      severity: GravitaSegnalazione.Media,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: { ...baseScope, tenantId: "", companyId: "" },
    });

    expect(result.success).toBe(false);
  });

  it("lists only visible reports inside actor tenant", async () => {
    const actor = makeActor({ role: SegnalazioniRole.Admin });
    const ownTenant = makeSegnalazione();
    const otherTenant = makeSegnalazione({
      id: "report-2",
      tenantId: "tenant-2",
      organizationalScope: { ...baseScope, tenantId: "tenant-2" },
    });
    const deps = makeDeps([ownTenant, otherTenant]);

    const result = await createListVisibleSegnalazioniUseCase(deps)({ actor });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((report) => report.id)).toEqual(["report-1"]);
    }
  });

  it("blocks detail access across tenants", async () => {
    const actor = makeActor({ role: SegnalazioniRole.Admin });
    const deps = makeDeps([
      makeSegnalazione({
        tenantId: "tenant-2",
        organizationalScope: { ...baseScope, tenantId: "tenant-2" },
      }),
    ]);

    const result = await createGetSegnalazioneByIdUseCase(deps)({ actor, id: "report-1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.CrossTenantAccess);
  });

  it("takes in charge when actor is authorized", async () => {
    const actor = makeActor({ role: SegnalazioniRole.ResponsabileSicurezza });
    const deps = makeDeps([makeSegnalazione()]);

    const result = await createTakeInChargeSegnalazioneUseCase(deps)({ actor, id: "report-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(StatoSegnalazione.PresaInCarico);
      expect(result.data.assignedToUserId).toBe(actor.userId);
    }
  });

  it("blocks take in charge for a segnalatore", async () => {
    const actor = makeActor({ role: SegnalazioniRole.Segnalatore });
    const deps = makeDeps([makeSegnalazione()]);

    const result = await createTakeInChargeSegnalazioneUseCase(deps)({ actor, id: "report-1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.Forbidden);
  });

  it("blocks invalid status transitions", async () => {
    const actor = makeActor({ role: SegnalazioniRole.ResponsabileSicurezza });
    const deps = makeDeps([makeSegnalazione()]);

    const result = await createChangeSegnalazioneStatusUseCase(deps)({
      actor,
      id: "report-1",
      status: StatoSegnalazione.Chiusa,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.InvalidTransition);
  });

  it("blocks empty comments", async () => {
    const deps = makeDeps([makeSegnalazione()]);
    const result = await createAddCommentUseCase(deps)({
      actor: makeActor(),
      id: "report-1",
      text: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.ValidationError);
  });

  it("blocks integration requests without reason", async () => {
    const deps = makeDeps([makeSegnalazione({ status: StatoSegnalazione.InLavorazione })]);
    const result = await createRequestIntegrationUseCase(deps)({
      actor: makeActor({ role: SegnalazioniRole.ResponsabileSicurezza }),
      id: "report-1",
      reason: " ",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.ValidationError);
  });

  it("blocks close from incompatible status", async () => {
    const deps = makeDeps([makeSegnalazione({ status: StatoSegnalazione.Nuova })]);
    const result = await createCloseSegnalazioneUseCase(deps)({
      actor: makeActor({ role: SegnalazioniRole.ResponsabileSicurezza }),
      id: "report-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.InvalidTransition);
  });

  it("records acknowledgement without changing report status", async () => {
    const report = makeSegnalazione({ status: StatoSegnalazione.PresaInCarico });
    const deps = makeDeps([report]);

    const result = await createAcknowledgeSegnalazioneUseCase(deps)({
      actor: makeActor({ role: SegnalazioniRole.Segnalatore }),
      id: "report-1",
    });

    expect(result.success).toBe(true);
    expect(deps.repository.acknowledgements).toHaveLength(1);
    expect(deps.repository.reports.get("report-1")?.status).toBe(StatoSegnalazione.PresaInCarico);
  });
});
