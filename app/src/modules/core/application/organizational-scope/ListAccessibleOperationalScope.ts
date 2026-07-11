import type { OrganizationalScopeRepository } from "./ports";
import type { OrganizationalScopeActor } from "./types";

export function createListAccessibleOperationalScopeUseCase(
  repository: OrganizationalScopeRepository,
) {
  return (actor: OrganizationalScopeActor) =>
    repository.listAccessibleScope(actor);
}
