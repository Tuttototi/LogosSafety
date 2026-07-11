import { StatoSegnalazione } from "../../domain";
import { ApplicationErrorCode, fail, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type ResolveSegnalazioneInput } from "../types";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

const MAX_RESOLUTION_LENGTH = 2000;

export function createResolveSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function resolveSegnalazione(input: ResolveSegnalazioneInput): Promise<ApplicationResult<Segnalazione>> {
    const resolution = input.resolution.trim();
    if (!resolution) {
      return fail(ApplicationErrorCode.ValidationError, "Resolution note is required");
    }
    if (resolution.length > MAX_RESOLUTION_LENGTH) {
      return fail(ApplicationErrorCode.ValidationError, "Resolution note is too long", {
        maxLength: MAX_RESOLUTION_LENGTH,
      });
    }

    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    return persistStatusChange(
      deps,
      input.actor,
      loadResult.data,
      StatoSegnalazione.Risolta,
      ApplicationEventType.SegnalazioneResolved,
      resolution,
    );
  };
}
