import { canManageSegnalazione, canCommentSegnalazione, StatoSegnalazione } from "../../domain";
import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type IntegrateSegnalazioneInput } from "../types";
import { applyStatusTransition, loadVisibleSegnalazione, makeComment, makeEvent, recordEvent } from "../helpers";
import type { Segnalazione } from "../../domain";

const MAX_INTEGRATION_TEXT_LENGTH = 2000;

function hasIntegrationContent(input: IntegrateSegnalazioneInput): boolean {
  return Boolean(input.text?.trim() || input.attachments?.length);
}

export function createIntegrateSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function integrateSegnalazione(
    input: IntegrateSegnalazioneInput,
  ): Promise<ApplicationResult<Segnalazione>> {
    if (!hasIntegrationContent(input)) {
      return fail(ApplicationErrorCode.ValidationError, "Integration text or attachment is required");
    }
    const text = input.text?.trim();
    if (text && text.length > MAX_INTEGRATION_TEXT_LENGTH) {
      return fail(ApplicationErrorCode.ValidationError, "Integration text is too long", {
        maxLength: MAX_INTEGRATION_TEXT_LENGTH,
      });
    }

    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    if (!canCommentSegnalazione(input.actor, loadResult.data) && !canManageSegnalazione(input.actor, loadResult.data)) {
      return fail(ApplicationErrorCode.Forbidden, "Actor cannot integrate this segnalazione");
    }

    const transitionResult = applyStatusTransition(
      deps,
      input.actor,
      loadResult.data,
      StatoSegnalazione.Integrata,
      text,
    );
    if (!transitionResult.success) return transitionResult;

    if (input.text?.trim() || input.attachments?.length) {
      await deps.repository.addComment({
        ...makeComment(
          deps,
          input.actor,
          loadResult.data,
          text || "Integrazione con allegati",
          true,
        ),
        allegati: input.attachments,
      });
    }

    await deps.repository.update(transitionResult.data);
    await recordEvent(
      deps,
      makeEvent(ApplicationEventType.SegnalazioneIntegrated, input.actor, transitionResult.data, deps.clock.now()),
    );

    return ok(transitionResult.data);
  };
}
