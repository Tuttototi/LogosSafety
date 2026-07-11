import type { OrganizationalScopeRepository } from "./ports";
import type {
  OperationalScopeSelection,
  OrganizationalScopeActor,
} from "./types";

export function createResolveOperationalScopeUseCase(
  repository: OrganizationalScopeRepository,
) {
  return (
    actor: OrganizationalScopeActor,
    selection?: OperationalScopeSelection,
  ) => repository.validateOperationalSelection(actor, selection);
}
