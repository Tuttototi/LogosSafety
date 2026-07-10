import { describe, expect, it } from "vitest";
import {
  canCommentSegnalazione,
  canManageSegnalazione,
  canSubmitSegnalazione,
  canViewSegnalazione,
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  validateReporter,
  type OrganizationalScope,
  type Reporter,
  type Segnalazione,
  type SegnalazioniActor,
} from "@/modules/segnalazioni/domain";

const baseScope: OrganizationalScope = {
  tenantId: "tenant-1",
  companyId: "company-1",
  contractId: "contract-1",
  siteId: "site-1",
  plantId: "plant-1",
  areaId: "area-1",
};

function makeActor(overrides: Partial<SegnalazioniActor> = {}): SegnalazioniActor {
  return {
    userId: "user-1",
    personId: "person-1",
    employeeId: "employee-1",
    firstName: "Mario",
    lastName: "Rossi",
    tenantId: baseScope.tenantId,
    companyId: baseScope.companyId,
    role: SegnalazioniRole.Segnalatore,
    active: true,
    organizationalScope: baseScope,
    assignedScopes: [baseScope],
    ...overrides,
  };
}

function makeReport(overrides: Partial<Segnalazione> = {}): Segnalazione {
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
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
    ...overrides,
  };
}

describe("segnalazioni domain reporter and scope policy", () => {
  it("validates an authenticated active reporter and rejects missing identity data", () => {
    const reporter = makeActor();
    expect(validateReporter(reporter).valid).toBe(true);

    const invalidReporter: Partial<Reporter> = {
      ...reporter,
      userId: "",
      personId: "",
    };

    const result = validateReporter(invalidReporter);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining(["reporter.userId is required", "reporter.personId is required"]),
      );
    }
  });

  it("allows a basic worker role to see only its own reports", () => {
    const actor = makeActor({ role: SegnalazioniRole.Dipendente });

    expect(canViewSegnalazione(actor, makeReport())).toBe(true);
    expect(
      canViewSegnalazione(
        actor,
        makeReport({
          createdByUserId: "other-user",
          createdByPersonId: "other-person",
          reporter: {
            userId: "other-user",
            personId: "other-person",
            firstName: "Sara",
            lastName: "Bianchi",
            companyId: baseScope.companyId,
            role: SegnalazioniRole.Segnalatore,
          },
        }),
      ),
    ).toBe(false);
  });

  it("allows capo impianto to see and comment reports for its assigned plant", () => {
    const actor = makeActor({
      role: SegnalazioniRole.CapoImpianto,
      userId: "plant-chief",
      personId: "plant-chief-person",
      assignedScopes: [{ ...baseScope, areaId: undefined }],
    });

    expect(canViewSegnalazione(actor, makeReport({ createdByUserId: "other-user" }))).toBe(true);
    expect(canCommentSegnalazione(actor, makeReport({ createdByUserId: "other-user" }))).toBe(true);
    expect(
      canViewSegnalazione(
        actor,
        makeReport({
          createdByUserId: "other-user",
          organizationalScope: { ...baseScope, plantId: "plant-2" },
        }),
      ),
    ).toBe(false);
  });

  it("allows capo area to see assigned operational scopes", () => {
    const actor = makeActor({
      role: SegnalazioniRole.CapoArea,
      userId: "area-chief",
      personId: "area-chief-person",
      assignedScopes: [{ tenantId: baseScope.tenantId, companyId: baseScope.companyId, areaId: "area-1" }],
    });

    expect(canViewSegnalazione(actor, makeReport({ createdByUserId: "other-user" }))).toBe(true);
    expect(
      canViewSegnalazione(
        actor,
        makeReport({
          createdByUserId: "other-user",
          organizationalScope: { ...baseScope, areaId: "area-2" },
        }),
      ),
    ).toBe(false);
  });

  it("blocks cross-tenant access without explicit permission", () => {
    const actor = makeActor({ role: SegnalazioniRole.Admin });

    expect(
      canManageSegnalazione(
        actor,
        makeReport({
          tenantId: "tenant-2",
          organizationalScope: { ...baseScope, tenantId: "tenant-2" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects inactive users for submit and visibility", () => {
    const actor = makeActor({ active: false });

    expect(
      canSubmitSegnalazione({
        tenantId: baseScope.tenantId,
        companyId: baseScope.companyId,
        reporter: actor,
        organizationalScope: baseScope,
        title: "Titolo valido",
        description: "Descrizione valida",
        priority: PrioritaSegnalazione.Media,
        severity: GravitaSegnalazione.Media,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
      }).valid,
    ).toBe(false);
    expect(canViewSegnalazione(actor, makeReport())).toBe(false);
  });

  it("rejects unknown roles", () => {
    const actor = makeActor({ role: "esterno" as SegnalazioniRole });

    expect(validateReporter(actor).valid).toBe(false);
    expect(canViewSegnalazione(actor, makeReport())).toBe(false);
  });
});

