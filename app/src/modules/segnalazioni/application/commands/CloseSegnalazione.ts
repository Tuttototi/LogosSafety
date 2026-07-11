import { StatoSegnalazione } from "../../domain";
import { ApplicationErrorCode, fail, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type CloseSegnalazioneInput } from "../types";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

const MAX_CLOSING_NOTE_LENGTH = 2000;

export function createCloseSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function closeSegnalazione(input: CloseSegnalazioneInput): Promise<ApplicationResult<Segnalazione>> {
    if (input.note && input.note.trim().length > MAX_CLOSING_NOTE_LENGTH) {
      return fail(ApplicationErrorCode.ValidationError, "Closing note is too long", {
        maxLength: MAX_CLOSING_NOTE_LENGTH,
      });
    }
    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    return persistStatusChange(
      deps,
      input.actor,
      loadResult.data,
      StatoSegnalazione.Chiusa,
      ApplicationEventType.SegnalazioneClosed,
      input.note,
    );
  };
}
