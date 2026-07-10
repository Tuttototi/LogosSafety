import type { Segnalazione } from "../../domain";
import type { ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import type { GetSegnalazioneByIdInput } from "../types";
import { loadVisibleSegnalazione } from "../helpers";

export function createGetSegnalazioneByIdUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function getSegnalazioneById(
    input: GetSegnalazioneByIdInput,
  ): Promise<ApplicationResult<Segnalazione>> {
    return loadVisibleSegnalazione(deps, input.actor, input.id);
  };
}

