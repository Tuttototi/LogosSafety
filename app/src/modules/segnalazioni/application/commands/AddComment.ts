import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type AddCommentInput } from "../types";
import { ensureCanComment, loadVisibleSegnalazione, makeComment, makeEvent, recordEvent } from "../helpers";
import type { Commento } from "../../domain";

export function createAddCommentUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function addComment(input: AddCommentInput): Promise<ApplicationResult<Commento>> {
    const text = input.text.trim();
    if (!text) {
      return fail(ApplicationErrorCode.ValidationError, "Comment text is required");
    }

    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    const commentPermission = ensureCanComment(input.actor, loadResult.data);
    if (!commentPermission.success) return commentPermission;

    const comment = {
      ...makeComment(deps, input.actor, loadResult.data, text, input.public ?? true),
      allegati: input.attachments,
    };

    await deps.repository.addComment(comment);
    await recordEvent(
      deps,
      {
        ...makeEvent(ApplicationEventType.CommentAdded, input.actor, loadResult.data, deps.clock.now(), {
          commentId: comment.id,
        }),
        entityType: "Commento",
        entityId: comment.id,
      },
    );

    return ok(comment);
  };
}

