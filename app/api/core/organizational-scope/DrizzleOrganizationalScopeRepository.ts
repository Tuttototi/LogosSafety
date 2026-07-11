import { and, eq, isNull, or } from "drizzle-orm";
import {
  contracts,
  microclimateSites,
  sites,
} from "@db/schema";
import { getDb } from "../../queries/connection";
import {
  OperationalScopeErrorCode,
  fail,
  hasOperationalSelection,
  isOperationalScopeAllowed,
  ok,
  type AccessibleArea,
  type AccessibleContract,
  type AccessibleOperationalScope,
  type AccessiblePlant,
  type AccessibleSite,
  type OperationalScopeResult,
  type OperationalScopeSelection,
  type OrganizationalScopeActor,
  type OrganizationalScopeRepository,
  type ResolvedOperationalScope,
} from "@/modules/core/application/organizational-scope";

export type OrganizationalScopeDatabase = ReturnType<typeof getDb>;

type ContractRow = {
  id: number;
  code: string;
  name: string;
  clientCompanyId: number | null;
  siteId: number | null;
  siteCompanyId: number | null;
};

type SiteRow = {
  id: number;
  name: string;
  companyId: number;
};

type PlantRow = {
  id: number;
  name: string;
  companyId: number;
  siteId: number | null;
};

function domainId(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, "it"),
  );
}

function toContractTarget(actor: OrganizationalScopeActor, row: ContractRow) {
  return {
    tenantId: actor.tenantId,
    companyId: actor.companyId,
    contractId: domainId(row.id),
    siteId: domainId(row.siteId),
  };
}

function toSiteTarget(actor: OrganizationalScopeActor, row: SiteRow) {
  return {
    tenantId: actor.tenantId,
    companyId: actor.companyId,
    siteId: domainId(row.id),
  };
}

function toPlantTarget(actor: OrganizationalScopeActor, row: PlantRow) {
  return {
    tenantId: actor.tenantId,
    companyId: actor.companyId,
    plantId: domainId(row.id),
    siteId: domainId(row.siteId),
  };
}

function contractMatchesCompany(actor: OrganizationalScopeActor, row: ContractRow): boolean {
  const companyId = Number(actor.companyId);
  return row.clientCompanyId === companyId || row.siteCompanyId === companyId;
}

function contractDto(row: ContractRow): AccessibleContract {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    siteId: domainId(row.siteId),
  };
}

function siteDto(row: SiteRow, contractId?: string): AccessibleSite {
  return {
    id: String(row.id),
    name: row.name,
    contractId,
  };
}

function plantDto(row: PlantRow, contractId?: string): AccessiblePlant {
  return {
    id: String(row.id),
    name: row.name,
    siteId: domainId(row.siteId),
    contractId,
  };
}

export class DrizzleOrganizationalScopeRepository implements OrganizationalScopeRepository {
  private readonly db: OrganizationalScopeDatabase;

  constructor(db: OrganizationalScopeDatabase = getDb()) {
    this.db = db;
  }

  async listContractsByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleContract[]> {
    const rows = await this.loadContractRows(actor);
    return sortByName(uniqueById(rows
      .filter((row) => contractMatchesCompany(actor, row))
      .filter((row) => isOperationalScopeAllowed(actor, toContractTarget(actor, row)))
      .map(contractDto)));
  }

  async listSitesByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleSite[]> {
    const [siteRows, contractRows] = await Promise.all([
      this.loadSiteRows(actor),
      this.loadContractRows(actor),
    ]);
    const accessibleContracts = contractRows
      .filter((row) => contractMatchesCompany(actor, row))
      .filter((row) => isOperationalScopeAllowed(actor, toContractTarget(actor, row)));
    const contractIdBySite = new Map(
      accessibleContracts
        .filter((contract) => contract.siteId)
        .map((contract) => [String(contract.siteId), String(contract.id)]),
    );

    return sortByName(uniqueById(siteRows
      .filter((row) =>
        isOperationalScopeAllowed(actor, toSiteTarget(actor, row)) ||
        contractIdBySite.has(String(row.id)),
      )
      .map((row) => siteDto(row, contractIdBySite.get(String(row.id))))));
  }

  async listPlantsByActorScope(actor: OrganizationalScopeActor): Promise<AccessiblePlant[]> {
    const [plantRows, contractRows] = await Promise.all([
      this.loadPlantRows(actor),
      this.loadContractRows(actor),
    ]);
    const contractIdBySite = new Map(
      contractRows
        .filter((row) => contractMatchesCompany(actor, row))
        .filter((row) => isOperationalScopeAllowed(actor, toContractTarget(actor, row)))
        .filter((contract) => contract.siteId)
        .map((contract) => [String(contract.siteId), String(contract.id)]),
    );

    return sortByName(uniqueById(plantRows
      .filter((row) =>
        isOperationalScopeAllowed(actor, toPlantTarget(actor, row)) ||
        (row.siteId ? contractIdBySite.has(String(row.siteId)) : false),
      )
      .map((row) => plantDto(row, row.siteId ? contractIdBySite.get(String(row.siteId)) : undefined))));
  }

  async listAreasByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleArea[]> {
    void actor;
    return [];
  }

  async listAccessibleScope(actor: OrganizationalScopeActor): Promise<AccessibleOperationalScope> {
    const [contractsList, sitesList, plantsList, areasList] = await Promise.all([
      this.listContractsByActorScope(actor),
      this.listSitesByActorScope(actor),
      this.listPlantsByActorScope(actor),
      this.listAreasByActorScope(actor),
    ]);

    return {
      contracts: contractsList,
      sites: sitesList,
      plants: plantsList,
      areas: areasList,
    };
  }

  async validateOperationalSelection(
    actor: OrganizationalScopeActor,
    selection?: OperationalScopeSelection,
  ): Promise<OperationalScopeResult<ResolvedOperationalScope>> {
    if (!hasOperationalSelection(selection)) {
      return ok({
        tenantId: actor.tenantId,
        companyId: actor.companyId,
      });
    }

    const accessible = await this.listAccessibleScope(actor);
    const contract = selection?.contractId
      ? accessible.contracts.find((item) => item.id === selection.contractId)
      : undefined;
    const site = selection?.siteId
      ? accessible.sites.find((item) => item.id === selection.siteId)
      : undefined;
    const plant = selection?.plantId
      ? accessible.plants.find((item) => item.id === selection.plantId)
      : undefined;
    const area = selection?.areaId
      ? accessible.areas.find((item) => item.id === selection.areaId)
      : undefined;

    if (selection?.contractId && !contract) {
      return fail(OperationalScopeErrorCode.Forbidden, "Operational contract is not available for the current actor");
    }
    if (selection?.siteId && !site) {
      return fail(OperationalScopeErrorCode.Forbidden, "Operational site is not available for the current actor");
    }
    if (selection?.plantId && !plant) {
      return fail(OperationalScopeErrorCode.Forbidden, "Operational plant is not available for the current actor");
    }
    if (selection?.areaId && !area) {
      return fail(OperationalScopeErrorCode.Forbidden, "Operational area is not available for the current actor");
    }

    const resolvedSiteId = selection?.siteId ?? contract?.siteId ?? plant?.siteId;

    if (contract?.siteId && resolvedSiteId && contract.siteId !== resolvedSiteId) {
      return fail(OperationalScopeErrorCode.InvalidSelection, "Operational contract and site are not coherent");
    }
    if (plant?.siteId && resolvedSiteId && plant.siteId !== resolvedSiteId) {
      return fail(OperationalScopeErrorCode.InvalidSelection, "Operational plant and site are not coherent");
    }
    if (plant?.contractId && contract?.id && plant.contractId !== contract.id) {
      return fail(OperationalScopeErrorCode.InvalidSelection, "Operational plant and contract are not coherent");
    }

    return ok({
      tenantId: actor.tenantId,
      companyId: actor.companyId,
      contractId: contract?.id,
      siteId: resolvedSiteId,
      plantId: plant?.id,
      areaId: area?.id,
    });
  }

  private async loadContractRows(actor: OrganizationalScopeActor): Promise<ContractRow[]> {
    const companyId = Number(actor.companyId);
    if (!Number.isFinite(companyId)) return [];

    return this.db
      .select({
        id: contracts.id,
        code: contracts.code,
        name: contracts.name,
        clientCompanyId: contracts.clientCompanyId,
        siteId: contracts.siteId,
        siteCompanyId: sites.companyId,
      })
      .from(contracts)
      .leftJoin(sites, eq(contracts.siteId, sites.id))
      .where(
        and(
          eq(contracts.active, true),
          eq(contracts.status, "attivo"),
          or(
            eq(contracts.clientCompanyId, companyId),
            eq(sites.companyId, companyId),
          ),
          or(isNull(contracts.siteId), eq(sites.active, true)),
        ),
      );
  }

  private async loadSiteRows(actor: OrganizationalScopeActor): Promise<SiteRow[]> {
    const companyId = Number(actor.companyId);
    if (!Number.isFinite(companyId)) return [];

    return this.db
      .select({
        id: sites.id,
        name: sites.name,
        companyId: sites.companyId,
      })
      .from(sites)
      .where(and(eq(sites.active, true), eq(sites.companyId, companyId)));
  }

  private async loadPlantRows(actor: OrganizationalScopeActor): Promise<PlantRow[]> {
    const companyId = Number(actor.companyId);
    if (!Number.isFinite(companyId)) return [];

    return this.db
      .select({
        id: microclimateSites.id,
        name: microclimateSites.name,
        companyId: microclimateSites.companyId,
        siteId: microclimateSites.siteId,
      })
      .from(microclimateSites)
      .where(and(eq(microclimateSites.active, true), eq(microclimateSites.companyId, companyId)));
  }
}
