import type { OrganizationalScopeRepository } from "./ports";
import type { OrganizationalScopeActor } from "./types";

export function createListAccessibleSitesUseCase(
  repository: OrganizationalScopeRepository,
) {
  return (actor: OrganizationalScopeActor) =>
    repository.listSitesByActorScope(actor);
}
