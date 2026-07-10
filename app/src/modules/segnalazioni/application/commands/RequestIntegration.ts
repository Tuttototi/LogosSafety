import { StatoSegnalazione } from "../../domain";
import { ApplicationErrorCode, fail, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type RequestIntegrationInput } from "../types";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

export function createRequestIntegrationUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function requestIntegration(input: RequestIntegrationInput): Promise<ApplicationResult<Segnalazione>> {
    const reason = input.reason.trim();
    if (!reason) {
      return fail(ApplicationErrorCode.ValidationError, "Integration request reason is required");
    }

    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    return persistStatusChange(
      deps,
      input.actor,
      loadResult.data,
      StatoSegnalazione.RichiestaIntegrazione,
      ApplicationEventType.IntegrationRequested,
      reason,
    );
  };
}

