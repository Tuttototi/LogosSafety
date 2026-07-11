import type { OrganizationalScopeRepository } from "./ports";
import type { OrganizationalScopeActor } from "./types";

export function createListAccessiblePlantsUseCase(
  repository: OrganizationalScopeRepository,
) {
  return (actor: OrganizationalScopeActor) =>
    repository.listPlantsByActorScope(actor);
}
