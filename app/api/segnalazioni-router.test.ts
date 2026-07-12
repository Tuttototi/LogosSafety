import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import {
  ApplicationErrorCode,
  type ApplicationActor,
  type ApplicationResult,
  type GetSegnalazioneByIdInput,
  type ListVisibleSegnalazioniInput,
  type CreateSegnalazioneInput,
} from "@/modules/segnalazioni/application";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  type OrganizationalScope,
  type Segnalazione,
} from "@/modules/segnalazioni/domain";
import type { TrpcContext } from "./context";
import {
  createSegnalazioniRouter,
  type SegnalazioniActorResolver,
  type SegnalazioniApiDependencies,
  type SegnalazioniDependencyFactory,
} from "./segnalazioni";
import {
  OperationalScopeErrorCode,
  fail as failScope,
  ok as okScope,
  type AccessibleOperationalScope,
  type OperationalScopeSelection,
  type OrganizationalScopeRepository,
  type OrganizationalScopeActor,
} from "@/modules/core/application/organizational-scope";

const baseScope: OrganizationalScope = {
  tenantId: "logos-safety-local",
  companyId: "logos-safety-company-local",
  plantId: "plant-a",
};

function ok<T>(data: T): ApplicationResult<T> {
  return { success: true, data };
}

function fail<T = never>(
  code: ApplicationErrorCode,
  message: string,
): ApplicationResult<T> {
  return { success: false, error: { code, message } };
}

function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    unionId: "api-segnalazioni-user",
    name: "Mario Rossi",
    email: "mario.rossi@example.test",
    avatar: null,
    role: "responsabile_sicurezza",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
    createdBy: null,
    ...overrides,
  };
}

function createContext(user?: User): TrpcContext {
  return {
    req: new Request("http://localhost/api/trpc/segnalazioni"),
    resHeaders: new Headers(),
    user,
  };
}

function makeSegnalazione(overrides: Partial<Segnalazione> = {}): Segnalazione {
  const organizationalScope = overrides.organizationalScope ?? baseScope;
  const tenantId = overrides.tenantId ?? organizationalScope.tenantId;
  const companyId = overrides.companyId ?? organizationalScope.companyId;

  return {
    id: "api-report-1",
    code: "SEG-API-001",
    tenantId,
    companyId,
    reporter: {
      userId: "legacy-user-1",
      personId: "legacy-person-1",
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario.rossi@example.test",
      companyId,
      role: SegnalazioniRole.ResponsabileSicurezza,
    },
    createdByUserId: "legacy-user-1",
    createdByPersonId: "legacy-person-1",
    organizationalScope,
    title: "Parapetto instabile",
    description: "Il parapetto del ponteggio non risulta fissato correttamente.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    attachments: [],
    comments: [],
    workflow: [],
    createdAt: "2026-07-11T10:00:00.000Z",
    updatedAt: "2026-07-11T10:00:00.000Z",
    ...overrides,
  };
}

function createDependencyFactory(options: {
  reports?: Segnalazione[];
  createResult?: ApplicationResult<Segnalazione>;
  listResult?: ApplicationResult<Segnalazione[]>;
  byIdResult?: ApplicationResult<Segnalazione>;
  throwOnCreate?: Error;
  calls?: {
    create?: CreateSegnalazioneInput[];
    list?: ListVisibleSegnalazioniInput[];
    byId?: GetSegnalazioneByIdInput[];
  };
} = {}): SegnalazioniDependencyFactory {
  const reports = options.reports ?? [makeSegnalazione()];

  return (): SegnalazioniApiDependencies => ({
    createSegnalazione: async (input) => {
      options.calls?.create?.push(input);
      if (options.throwOnCreate) throw options.throwOnCreate;
      return options.createResult ?? ok(makeSegnalazione({
        id: "api-report-created",
        title: input.title,
        description: input.description,
        priority: input.priority,
        severity: input.severity,
        category: input.category,
        type: input.type,
        organizationalScope: input.organizationalScope,
        tenantId: input.actor.tenantId,
        companyId: input.actor.companyId,
        createdByUserId: input.actor.userId,
        createdByPersonId: input.actor.personId,
        reporter: {
          userId: input.actor.userId,
          personId: input.actor.personId,
          firstName: input.actor.firstName,
          lastName: input.actor.lastName,
          companyId: input.actor.companyId,
          role: input.actor.role,
          email: input.actor.email,
        },
      }));
    },
    listVisibleSegnalazioni: async (input) => {
      options.calls?.list?.push(input);
      return options.listResult ?? ok(reports.filter((report) => (
        report.tenantId === input.actor.tenantId &&
        report.companyId === input.actor.companyId &&
        (!input.organizationalScope?.plantId ||
          report.organizationalScope.plantId === input.organizationalScope.plantId)
      )));
    },
    getSegnalazioneById: async (input) => {
      options.calls?.byId?.push(input);
      const found = reports.find(
        (report) => report.id === input.id && report.tenantId === input.actor.tenantId,
      );
      return options.byIdResult ?? (found ? ok(found) : fail(ApplicationErrorCode.NotFound, "Segnalazione not found"));
    },
    addComment: async (input) => ok({
      id: "comment-1",
      segnalazioneId: input.id,
      testo: input.text,
      autoreId: input.actor.userId,
      autoreNome: `${input.actor.firstName} ${input.actor.lastName}`,
      pubblico: true,
      createdAt: "2026-07-11T11:00:00.000Z",
      updatedAt: "2026-07-11T11:00:00.000Z",
    }),
    requestIntegration: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: StatoSegnalazione.RichiestaIntegrazione,
      workflow: [{
        id: "workflow-request",
        segnalazioneId: input.id,
        statoDa: StatoSegnalazione.InLavorazione,
        statoA: StatoSegnalazione.RichiestaIntegrazione,
        eseguitoDaId: input.actor.userId,
        eseguitoDaNome: `${input.actor.firstName} ${input.actor.lastName}`,
        note: input.reason,
        createdAt: "2026-07-11T11:00:00.000Z",
      }],
    })),
    integrateSegnalazione: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: StatoSegnalazione.Integrata,
    })),
    takeInChargeSegnalazione: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: StatoSegnalazione.PresaInCarico,
      assignedToUserId: input.actor.userId,
      responsibleUserId: input.actor.userId,
    })),
    changeSegnalazioneStatus: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: input.status,
    })),
    resolveSegnalazione: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: StatoSegnalazione.Risolta,
    })),
    closeSegnalazione: async (input) => ok(makeSegnalazione({
      id: input.id,
      status: StatoSegnalazione.Chiusa,
      closedAt: "2026-07-11T12:00:00.000Z",
    })),
    acknowledgeSegnalazione: async (input) => ok({
      id: "ack-1",
      segnalazioneId: input.id,
      tenantId: input.actor.tenantId,
      companyId: input.actor.companyId,
      userId: input.actor.userId,
      personId: input.actor.personId,
      acknowledgedAt: "2026-07-11T12:00:00.000Z",
    }),
    hasAcknowledgement: async () => false,
    listAcknowledgements: async () => [],
  });
}

function makeApplicationActor(overrides: Partial<ApplicationActor> = {}): ApplicationActor {
  return {
    userId: "legacy-user-1",
    personId: "legacy-person-1",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario.rossi@example.test",
    tenantId: baseScope.tenantId,
    companyId: baseScope.companyId,
    role: SegnalazioniRole.ResponsabileSicurezza,
    active: true,
    organizationalScope: baseScope,
    assignedScopes: [baseScope],
    canAccessAllTenants: false,
    ...overrides,
  };
}

function createActorResolver(options: {
  actor?: ApplicationActor;
  calls?: TrpcContext[];
  throwError?: Error;
} = {}): SegnalazioniActorResolver {
  return async (ctx) => {
    options.calls?.push(ctx);
    if (options.throwError) throw options.throwError;
    return options.actor ?? makeApplicationActor();
  };
}

const accessibleScope: AccessibleOperationalScope = {
  contracts: [{ id: "contract-a", code: "CTR-A", name: "Commessa A", siteId: "site-a" }],
  sites: [{ id: "site-a", name: "Sede A", contractId: "contract-a" }],
  plants: [{ id: "plant-a", name: "Impianto A", siteId: "site-a", contractId: "contract-a" }],
  areas: [],
};

function createScopeRepository(options: {
  scope?: AccessibleOperationalScope;
  invalidSelections?: OperationalScopeSelection[];
  incoherentSelections?: OperationalScopeSelection[];
  calls?: { validate?: OperationalScopeSelection[]; list?: OrganizationalScopeActor[] };
} = {}): OrganizationalScopeRepository {
  const scope = options.scope ?? accessibleScope;
  return {
    listContractsByActorScope: async () => scope.contracts,
    listSitesByActorScope: async () => scope.sites,
    listPlantsByActorScope: async () => scope.plants,
    listAreasByActorScope: async () => scope.areas,
    listAccessibleScope: async (actor) => {
      options.calls?.list?.push(actor);
      return scope;
    },
    validateOperationalSelection: async (_actor, selection) => {
      options.calls?.validate?.push(selection ?? {});
      const invalid = options.invalidSelections?.some((item) =>
        item.contractId === selection?.contractId &&
        item.siteId === selection?.siteId &&
        item.plantId === selection?.plantId
      );
      if (invalid) {
        return failScope(OperationalScopeErrorCode.Forbidden, "Operational scope is not available");
      }
      const incoherent = options.incoherentSelections?.some((item) =>
        item.contractId === selection?.contractId &&
        item.siteId === selection?.siteId &&
        item.plantId === selection?.plantId
      );
      if (incoherent) {
        return failScope(OperationalScopeErrorCode.InvalidSelection, "Operational scope is incoherent");
      }
      return okScope({
        tenantId: baseScope.tenantId,
        companyId: baseScope.companyId,
        contractId: selection?.contractId,
        siteId: selection?.siteId ?? scope.contracts.find((item) => item.id === selection?.contractId)?.siteId,
        plantId: selection?.plantId,
        areaId: selection?.areaId,
      });
    },
  };
}

function createScopeFactory(repository: OrganizationalScopeRepository) {
  return () => repository;
}

describe("segnalazioni tRPC router", () => {
  it("exposes only minimal accessible operational scope DTOs", async () => {
    const listCalls: OrganizationalScopeActor[] = [];
    const router = createSegnalazioniRouter(
      createDependencyFactory(),
      createActorResolver(),
      createScopeFactory(createScopeRepository({ calls: { list: listCalls } })),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.availableScope();

    expect(listCalls).toHaveLength(1);
    expect(result.contracts).toEqual([{ id: "contract-a", code: "CTR-A", name: "Commessa A", siteId: "site-a" }]);
    expect(result.sites).toEqual([{ id: "site-a", name: "Sede A", contractId: "contract-a" }]);
    expect(result.plants).toEqual([{ id: "plant-a", name: "Impianto A", siteId: "site-a", contractId: "contract-a" }]);
    expect(result).not.toHaveProperty("tenantId");
    expect(result.contracts[0]).not.toHaveProperty("clientCompanyId");
  });

  it("creates a segnalazione from authenticated server context", async () => {
    const calls = { create: [] as CreateSegnalazioneInput[] };
    const router = createSegnalazioniRouter(
      createDependencyFactory({ calls }),
      createActorResolver(),
      createScopeFactory(createScopeRepository()),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.create({
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: { plantId: "plant-a" },
    });

    expect(result.id).toBe("api-report-created");
    expect(result.status).toBe(StatoSegnalazione.Nuova);
    expect(calls.create[0]?.actor.userId).toBe("legacy-user-1");
    expect(calls.create[0]?.actor.role).toBe(SegnalazioniRole.ResponsabileSicurezza);
    expect(calls.create[0]?.organizationalScope).toMatchObject({
      tenantId: baseScope.tenantId,
      companyId: baseScope.companyId,
      plantId: "plant-a",
    });
  });

  it("creates a segnalazione with a valid accessible contract scope", async () => {
    const calls = {
      create: [] as CreateSegnalazioneInput[],
      validate: [] as OperationalScopeSelection[],
    };
    const router = createSegnalazioniRouter(
      createDependencyFactory({ calls }),
      createActorResolver(),
      createScopeFactory(createScopeRepository({ calls })),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    await caller.create({
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: { contractId: "contract-a" },
    });

    expect(calls.validate[0]).toEqual({ contractId: "contract-a" });
    expect(calls.create[0]?.organizationalScope).toMatchObject({
      tenantId: baseScope.tenantId,
      companyId: baseScope.companyId,
      contractId: "contract-a",
      siteId: "site-a",
    });
  });

  it("blocks create with a contract outside actor scope", async () => {
    const router = createSegnalazioniRouter(
      createDependencyFactory(),
      createActorResolver(),
      createScopeFactory(createScopeRepository({
        invalidSelections: [{ contractId: "outside-contract" }],
      })),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(caller.create({
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: { contractId: "outside-contract" },
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks create with incoherent contract and site selection", async () => {
    const router = createSegnalazioniRouter(
      createDependencyFactory(),
      createActorResolver(),
      createScopeFactory(createScopeRepository({
        incoherentSelections: [{ contractId: "contract-a", siteId: "other-site" }],
      })),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(caller.create({
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: { contractId: "contract-a", siteId: "other-site" },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("denies anonymous create calls", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory(), createActorResolver());
    const caller = router.createCaller(createContext());

    await expect(
      caller.create({
        title: "Parapetto instabile",
        description: "Il parapetto del ponteggio non risulta fissato correttamente.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not accept tenant, company or role from client input", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory(), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));
    const maliciousInput = {
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      role: "admin",
      tenantId: "tenant-from-client",
      organizationalScope: {
        tenantId: "tenant-from-client",
        companyId: "company-from-client",
      },
    } as unknown as Parameters<typeof caller.create>[0];

    await expect(caller.create(maliciousInput)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps inactive users to forbidden", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      createResult: fail(ApplicationErrorCode.InactiveUser, "Actor is inactive"),
    }), createActorResolver({ actor: makeApplicationActor({ active: false }) }));
    const caller = router.createCaller(createContext(createTestUser({ active: false })));

    await expect(
      caller.create({
        title: "Parapetto instabile",
        description: "Il parapetto del ponteggio non risulta fissato correttamente.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists only reports returned for the authenticated tenant", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({ id: "same-tenant" }),
        makeSegnalazione({
          id: "other-tenant",
          tenantId: "other-tenant",
          organizationalScope: { ...baseScope, tenantId: "other-tenant" },
        }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list();

    expect(result.items.map((item) => item.id)).toEqual(["same-tenant"]);
    expect(result.total).toBe(1);
  });

  it("does not narrow the default list to the actor first explicit scope", async () => {
    const calls = { list: [] as ListVisibleSegnalazioniInput[] };
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({
          id: "company-level-report",
          organizationalScope: {
            tenantId: baseScope.tenantId,
            companyId: baseScope.companyId,
          },
        }),
      ],
      calls,
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list();

    expect(calls.list[0]?.organizationalScope).toBeUndefined();
    expect(result.items.map((item) => item.id)).toEqual(["company-level-report"]);
  });

  it("filters list results by plant scope", async () => {
    const router = createSegnalazioniRouter(
      createDependencyFactory({
        reports: [
          makeSegnalazione({ id: "plant-a", organizationalScope: { ...baseScope, plantId: "plant-a" } }),
          makeSegnalazione({ id: "plant-b", organizationalScope: { ...baseScope, plantId: "plant-b" } }),
        ],
      }),
      createActorResolver(),
      createScopeFactory(createScopeRepository()),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list({ organizationalScope: { plantId: "plant-a" } });

    expect(result.items.map((item) => item.id)).toEqual(["plant-a"]);
  });

  it("filters list results by current author only", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({ id: "mine", createdByUserId: "legacy-user-1" }),
        makeSegnalazione({
          id: "other-author",
          createdByUserId: "legacy-user-99",
          createdByPersonId: "legacy-person-99",
          reporter: {
            userId: "legacy-user-99",
            personId: "legacy-person-99",
            firstName: "Altro",
            lastName: "Utente",
            companyId: baseScope.companyId,
            role: SegnalazioniRole.Segnalatore,
          },
        }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list({ createdByMe: true });

    expect(result.items.map((item) => item.id)).toEqual(["mine"]);
  });

  it("applies status, priority, pagination and page size limit", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({ id: "first", priority: PrioritaSegnalazione.Alta, status: StatoSegnalazione.Nuova }),
        makeSegnalazione({ id: "second", priority: PrioritaSegnalazione.Alta, status: StatoSegnalazione.Nuova }),
        makeSegnalazione({ id: "third", priority: PrioritaSegnalazione.Media, status: StatoSegnalazione.Risolta }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list({
      status: StatoSegnalazione.Nuova,
      priority: PrioritaSegnalazione.Alta,
      page: 2,
      pageSize: 1,
    });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);

    await expect(caller.list({ pageSize: 51 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("filters list results by created period server-side", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({ id: "before-period", createdAt: "2026-07-01T10:00:00.000Z" }),
        makeSegnalazione({ id: "inside-period", createdAt: "2026-07-11T10:00:00.000Z" }),
        makeSegnalazione({ id: "after-period", createdAt: "2026-07-20T10:00:00.000Z" }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list({
      createdFrom: "2026-07-10",
      createdTo: "2026-07-12",
    });

    expect(result.items.map((item) => item.id)).toEqual(["inside-period"]);
    await expect(caller.list({
      createdFrom: "2026-07-12",
      createdTo: "2026-07-10",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns in-app notifications derived from visible report timelines", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({
          id: "notify-report",
          code: "SEG-NOTIFY-001",
          comments: [
            {
              id: "comment-self",
              segnalazioneId: "notify-report",
              testo: "Commento proprio non notificato",
              autoreId: "legacy-user-1",
              autoreNome: "Mario Rossi",
              pubblico: true,
              createdAt: "2026-07-11T10:00:00.000Z",
              updatedAt: "2026-07-11T10:00:00.000Z",
            },
            {
              id: "comment-other",
              segnalazioneId: "notify-report",
              testo: "Commento ricevuto",
              autoreId: "manager-2",
              autoreNome: "Laura Bianchi",
              pubblico: true,
              createdAt: "2026-07-11T11:00:00.000Z",
              updatedAt: "2026-07-11T11:00:00.000Z",
            },
          ],
          workflow: [
            {
              id: "workflow-self",
              segnalazioneId: "notify-report",
              statoDa: StatoSegnalazione.Nuova,
              statoA: StatoSegnalazione.PresaInCarico,
              eseguitoDaId: "legacy-user-1",
              eseguitoDaNome: "Mario Rossi",
              createdAt: "2026-07-11T09:00:00.000Z",
            },
            {
              id: "workflow-request",
              segnalazioneId: "notify-report",
              statoDa: StatoSegnalazione.InLavorazione,
              statoA: StatoSegnalazione.RichiestaIntegrazione,
              eseguitoDaId: "manager-2",
              eseguitoDaNome: "Laura Bianchi",
              note: "Serve integrazione",
              createdAt: "2026-07-11T12:00:00.000Z",
            },
            {
              id: "workflow-resolved",
              segnalazioneId: "notify-report",
              statoDa: StatoSegnalazione.Integrata,
              statoA: StatoSegnalazione.Risolta,
              eseguitoDaId: "manager-2",
              eseguitoDaNome: "Laura Bianchi",
              createdAt: "2026-07-11T13:00:00.000Z",
            },
          ],
        }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.notifications();

    expect(result.source).toBe("timeline-derived");
    expect(result.readState).toBe("not-persisted");
    expect(result.unreadCount).toBe(3);
    expect(result.items.map((item) => item.type)).toEqual([
      "resolved",
      "integration_requested",
      "comment_received",
    ]);
    expect(result.items[0]).toMatchObject({
      reportId: "notify-report",
      reportCode: "SEG-NOTIFY-001",
      read: false,
      detailPath: "/segnalazioni?report=notify-report",
    });
    expect(result.items.map((item) => item.id)).not.toContain("notify-report:workflow:workflow-self");
    expect(result.items.map((item) => item.id)).not.toContain("notify-report:comment:comment-self");
  });

  it("returns detail only for a visible report", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [makeSegnalazione({ id: "visible-report" })],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.byId({ id: "visible-report" });

    expect(result.id).toBe("visible-report");
    expect(result.reporter).toMatchObject({
      firstName: "Mario",
      lastName: "Rossi",
      role: SegnalazioniRole.ResponsabileSicurezza,
    });
  });

  it("keeps list DTOs synthetic without comments or attachments", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      reports: [
        makeSegnalazione({
          id: "synthetic-list-item",
          comments: [
            {
              id: "comment-1",
              segnalazioneId: "synthetic-list-item",
              testo: "Commento non esposto in lista",
              autoreId: "legacy-user-1",
              autoreNome: "Mario Rossi",
              pubblico: true,
              createdAt: "2026-07-11T10:00:00.000Z",
              updatedAt: "2026-07-11T10:00:00.000Z",
            },
          ],
        }),
      ],
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.list();

    expect(result.items[0]).toMatchObject({
      id: "synthetic-list-item",
      reporterDisplayName: "Mario Rossi",
    });
    expect(result.items[0]).not.toHaveProperty("comments");
    expect(result.items[0]).not.toHaveProperty("attachments");
  });

  it("does not leak cross-tenant detail access", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      byIdResult: fail(ApplicationErrorCode.CrossTenantAccess, "Cross-tenant access is not allowed"),
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(caller.byId({ id: "other-tenant-report" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("maps validation failures to bad request", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      createResult: fail(ApplicationErrorCode.ValidationError, "Segnalazione input is invalid"),
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(
      caller.create({
        title: "Parapetto instabile",
        description: "Il parapetto del ponteggio non risulta fissato correttamente.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps conflicts without returning persistence details", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      createResult: fail(ApplicationErrorCode.Conflict, "Generated segnalazione code already exists"),
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(
      caller.create({
        title: "Parapetto instabile",
        description: "Il parapetto del ponteggio non risulta fissato correttamente.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Generated segnalazione code already exists",
    });
  });

  it("sanitizes unexpected repository errors", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory({
      throwOnCreate: new Error("raw database connection details"),
    }), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(
      caller.create({
        title: "Parapetto instabile",
        description: "Il parapetto del ponteggio non risulta fissato correttamente.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Segnalazioni operation failed",
    });
  });

  it("uses the identity actor resolver server-side", async () => {
    const identityCalls: TrpcContext[] = [];
    const router = createSegnalazioniRouter(
      createDependencyFactory(),
      createActorResolver({ calls: identityCalls }),
    );
    const caller = router.createCaller(createContext(createTestUser()));

    await caller.byId({ id: "api-report-1" });

    expect(identityCalls).toHaveLength(1);
    expect(identityCalls[0]?.user?.id).toBe(1);
  });

  it("returns server-side capabilities and timeline in detail", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory(), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.byId({ id: "api-report-1" });

    expect(result.capabilities.canTakeInCharge).toBe(true);
    expect(result.capabilities.allowedStatusTransitions).toEqual([StatoSegnalazione.PresaInCarico]);
    expect(result.timeline[0]).toMatchObject({
      type: "created",
      newStatus: StatoSegnalazione.Nuova,
    });
    expect(result.acknowledgement.acknowledged).toBe(false);
  });

  it("adds a comment without accepting client author fields", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory(), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    const result = await caller.addComment({
      id: "api-report-1",
      text: "Verifica effettuata in cantiere.",
    });

    expect(result.comment).toMatchObject({
      testo: "Verifica effettuata in cantiere.",
      autoreId: "legacy-user-1",
    });

    await expect(caller.addComment({
      id: "api-report-1",
      text: "Commento",
      authorUserId: "malicious",
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("executes workflow mutations through application use cases", async () => {
    const router = createSegnalazioniRouter(createDependencyFactory(), createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(caller.takeInCharge({ id: "api-report-1" })).resolves.toMatchObject({
      status: StatoSegnalazione.PresaInCarico,
      assignedToUserId: "legacy-user-1",
    });
    await expect(caller.requestIntegration({
      id: "api-report-1",
      message: "Serve integrazione fotografica.",
    })).resolves.toMatchObject({
      status: StatoSegnalazione.RichiestaIntegrazione,
    });
    await expect(caller.integrate({
      id: "api-report-1",
      message: "Integrazione inviata.",
    })).resolves.toMatchObject({
      status: StatoSegnalazione.Integrata,
    });
    await expect(caller.changeStatus({
      id: "api-report-1",
      targetStatus: StatoSegnalazione.InLavorazione,
    })).resolves.toMatchObject({
      status: StatoSegnalazione.InLavorazione,
    });
    await expect(caller.resolve({
      id: "api-report-1",
      resolutionNote: "Risoluzione completata.",
    })).resolves.toMatchObject({
      status: StatoSegnalazione.Risolta,
    });
    await expect(caller.close({
      id: "api-report-1",
      closingNote: "Chiusura confermata.",
    })).resolves.toMatchObject({
      status: StatoSegnalazione.Chiusa,
    });
    await expect(caller.acknowledge({ id: "api-report-1" })).resolves.toMatchObject({
      acknowledged: true,
    });
  });

  it("maps unsupported legacy read roles to non-management domain roles", async () => {
    const calls = { create: [] as CreateSegnalazioneInput[] };
    const router = createSegnalazioniRouter(
      createDependencyFactory({ calls }),
      createActorResolver({ actor: makeApplicationActor({ role: SegnalazioniRole.Dipendente }) }),
    );
    const caller = router.createCaller(createContext(createTestUser({ role: "sola_lettura" })));

    await caller.create({
      title: "Parapetto instabile",
      description: "Il parapetto del ponteggio non risulta fissato correttamente.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
    });

    expect(calls.create[0]?.actor.role).toBe(SegnalazioniRole.Dipendente);
  });

  it("preserves tRPC errors thrown by middleware", async () => {
    const router = createSegnalazioniRouter(() => {
      throw new TRPCError({ code: "FORBIDDEN", message: "forbidden" });
    }, createActorResolver());
    const caller = router.createCaller(createContext(createTestUser()));

    await expect(caller.byId({ id: "api-report-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "forbidden",
    });
  });
});
