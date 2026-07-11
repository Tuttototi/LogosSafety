import type {
  AccessibleArea,
  AccessibleContract,
  AccessibleOperationalScope,
  AccessiblePlant,
  AccessibleSite,
  OperationalScopeResult,
  OperationalScopeSelection,
  OrganizationalScopeActor,
  ResolvedOperationalScope,
} from "./types";

export interface OrganizationalScopeRepository {
  listContractsByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleContract[]>;
  listSitesByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleSite[]>;
  listPlantsByActorScope(actor: OrganizationalScopeActor): Promise<AccessiblePlant[]>;
  listAreasByActorScope(actor: OrganizationalScopeActor): Promise<AccessibleArea[]>;
  listAccessibleScope(actor: OrganizationalScopeActor): Promise<AccessibleOperationalScope>;
  validateOperationalSelection(
    actor: OrganizationalScopeActor,
    selection?: OperationalScopeSelection,
  ): Promise<OperationalScopeResult<ResolvedOperationalScope>>;
}
