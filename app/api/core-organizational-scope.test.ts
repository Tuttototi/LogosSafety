import { describe, expect, it } from "vitest";
import {
  createListAccessibleOperationalScopeUseCase,
  createResolveOperationalScopeUseCase,
  isOperationalScopeAllowed,
  ok,
  type AccessibleArea,
  type AccessibleContract,
  type AccessibleOperationalScope,
  type AccessiblePlant,
  type AccessibleSite,
  type OperationalScopeSelection,
  type OrganizationalScopeActor,
  type OrganizationalScopeRepository,
} from "@/modules/core/application/organizational-scope";

type ContractFixture = AccessibleContract & { tenantId: string; companyId: string; active: boolean };
type SiteFixture = AccessibleSite & { tenantId: string; companyId: string; active: boolean };
type PlantFixture = AccessiblePlant & { tenantId: string; companyId: string; active: boolean };

const contracts: ContractFixture[] = [
  { id: "contract-a", code: "CTR-A", name: "Commessa A", siteId: "site-a", tenantId: "tenant-a", companyId: "company-a", active: true },
  { id: "contract-b", code: "CTR-B", name: "Commessa B", siteId: "site-b", tenantId: "tenant-a", companyId: "company-a", active: true },
  { id: "contract-inactive", code: "CTR-X", name: "Commessa X", siteId: "site-a", tenantId: "tenant-a", companyId: "company-a", active: false },
  { id: "contract-other-tenant", code: "CTR-T", name: "Commessa T", siteId: "site-t", tenantId: "tenant-b", companyId: "company-b", active: true },
  { id: "contract-a", code: "CTR-A", name: "Commessa A", siteId: "site-a", tenantId: "tenant-a", companyId: "company-a", active: true },
];
const sites: SiteFixture[] = [
  { id: "site-a", name: "Sede A", contractId: "contract-a", tenantId: "tenant-a", companyId: "company-a", active: true },
  { id: "site-b", name: "Sede B", contractId: "contract-b", tenantId: "tenant-a", companyId: "company-a", active: true },
  { id: "site-inactive", name: "Sede inattiva", tenantId: "tenant-a", companyId: "company-a", active: false },
];
const plants: PlantFixture[] = [
  { id: "plant-a", name: "Impianto A", siteId: "site-a", contractId: "contract-a", tenantId: "tenant-a", companyId: "company-a", active: true },
  { id: "plant-b", name: "Impianto B", siteId: "site-b", contractId: "contract-b", tenantId: "tenant-a", companyId: "company-a", active: true },
];

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function makeActor(overrides: Partial<OrganizationalScopeActor> = {}): OrganizationalScopeActor {
  return {
    tenantId: "tenant-a",
    companyId: "company-a",
    role: "admin",
    active: true,
    organizationalScope: { tenantId: "tenant-a", companyId: "company-a" },
    assignedScopes: [{ tenantId: "tenant-a", companyId: "company-a" }],
    canAccessAllTenants: false,
    ...overrides,
  };
}

class InMemoryOrganizationalScopeRepository implements OrganizationalScopeRepository {
  async listContractsByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleContract[]> {
    return uniqueById(contracts
      .filter((item) => item.active)
      .filter((item) => isOperationalScopeAllowed(actor, {
        tenantId: item.tenantId,
        companyId: item.companyId,
        contractId: item.id,
        siteId: item.siteId,
      }))
      .map(({ id, code, name, siteId }) => ({ id, code, name, siteId })));
  }

  async listSitesByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleSite[]> {
    return uniqueById(sites
      .filter((item) => item.active)
      .filter((item) => isOperationalScopeAllowed(actor, {
        tenantId: item.tenantId,
        companyId: item.companyId,
        siteId: item.id,
        contractId: item.contractId,
      }))
      .map(({ id, name, contractId }) => ({ id, name, contractId })));
  }

  async listPlantsByActorScope(actor: OrganizationalScopeActor): Promise<AccessiblePlant[]> {
    return uniqueById(plants
      .filter((item) => item.active)
      .filter((item) => isOperationalScopeAllowed(actor, {
        tenantId: item.tenantId,
        companyId: item.companyId,
        plantId: item.id,
        siteId: item.siteId,
        contractId: item.contractId,
      }))
      .map(({ id, name, siteId, contractId }) => ({ id, name, siteId, contractId })));
  }

  async listAreasByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleArea[]> {
    void actor;
    return [];
  }

  async listAccessibleScope(actor: OrganizationalScopeActor): Promise<AccessibleOperationalScope> {
    return {
      contracts: await this.listContractsByActorScope(actor),
      sites: await this.listSitesByActorScope(actor),
      plants: await this.listPlantsByActorScope(actor),
      areas: [],
    };
  }

  async validateOperationalSelection(actor: OrganizationalScopeActor, selection?: OperationalScopeSelection) {
    return ok({
      tenantId: actor.tenantId,
      companyId: actor.companyId,
      contractId: selection?.contractId,
      siteId: selection?.siteId,
      plantId: selection?.plantId,
      areaId: selection?.areaId,
    });
  }
}

const repository = new InMemoryOrganizationalScopeRepository();
const listAccessible = createListAccessibleOperationalScopeUseCase(repository);
const resolveScope = createResolveOperationalScopeUseCase(repository);

describe("organizational scope resolver", () => {
  it("lets admin see the company scope allowed by the actor", async () => {
    const result = await listAccessible(makeActor({ role: "admin" }));

    expect(result.contracts.map((item) => item.id)).toEqual(["contract-a", "contract-b"]);
    expect(result.sites.map((item) => item.id)).toEqual(["site-a", "site-b"]);
  });

  it("lets capo_area see only assigned site contracts and plants", async () => {
    const result = await listAccessible(makeActor({
      role: "capo_area",
      organizationalScope: { tenantId: "tenant-a", companyId: "company-a", siteId: "site-a" },
      assignedScopes: [{ tenantId: "tenant-a", companyId: "company-a", siteId: "site-a" }],
    }));

    expect(result.contracts.map((item) => item.id)).toEqual(["contract-a"]);
    expect(result.plants.map((item) => item.id)).toEqual(["plant-a"]);
  });

  it("lets capo_impianto see only the assigned plant", async () => {
    const result = await listAccessible(makeActor({
      role: "capo_impianto",
      organizationalScope: { tenantId: "tenant-a", companyId: "company-a", plantId: "plant-a" },
      assignedScopes: [{ tenantId: "tenant-a", companyId: "company-a", plantId: "plant-a" }],
    }));

    expect(result.plants.map((item) => item.id)).toEqual(["plant-a"]);
    expect(result.contracts).toEqual([]);
  });

  it("lets referente_commessa see only the assigned contract", async () => {
    const result = await listAccessible(makeActor({
      role: "referente_commessa",
      organizationalScope: { tenantId: "tenant-a", companyId: "company-a", contractId: "contract-b" },
      assignedScopes: [{ tenantId: "tenant-a", companyId: "company-a", contractId: "contract-b" }],
    }));

    expect(result.contracts.map((item) => item.id)).toEqual(["contract-b"]);
  });

  it("lets operator see only the assigned operational scope", async () => {
    const result = await listAccessible(makeActor({
      role: "operatore",
      organizationalScope: { tenantId: "tenant-a", companyId: "company-a", contractId: "contract-a" },
      assignedScopes: [{ tenantId: "tenant-a", companyId: "company-a", contractId: "contract-a" }],
    }));

    expect(result.contracts.map((item) => item.id)).toEqual(["contract-a"]);
  });

  it("blocks cross-tenant records through the actor boundary", async () => {
    const result = await listAccessible(makeActor());

    expect(result.contracts.map((item) => item.id)).not.toContain("contract-other-tenant");
  });

  it("excludes inactive records and removes duplicates", async () => {
    const result = await listAccessible(makeActor());

    expect(result.contracts.map((item) => item.id)).toEqual(["contract-a", "contract-b"]);
    expect(result.contracts.map((item) => item.id)).not.toContain("contract-inactive");
  });

  it("resolves selected ids without trusting tenant or company from the client", async () => {
    const result = await resolveScope(makeActor(), { contractId: "contract-a" });

    expect(result).toMatchObject({
      success: true,
      data: {
        tenantId: "tenant-a",
        companyId: "company-a",
        contractId: "contract-a",
      },
    });
  });
});
