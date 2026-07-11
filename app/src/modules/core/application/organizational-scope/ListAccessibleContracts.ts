import type { OrganizationalScopeRepository } from "./ports";
import type { OrganizationalScopeActor } from "./types";

export function createListAccessibleContractsUseCase(
  repository: OrganizationalScopeRepository,
) {
  return (actor: OrganizationalScopeActor) =>
    repository.listContractsByActorScope(actor);
}
