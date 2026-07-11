import { trpc } from "@/providers/trpc";
import { buildCreateSegnalazionePayload } from "../mappers/segnalazioni-ui-mapper";
import type { DraftReport } from "../types";

type UseCreateSegnalazioneOptions = {
  onSuccess?: (createdId: string) => void;
};

export function useCreateSegnalazione(options: UseCreateSegnalazioneOptions = {}) {
  const utils = trpc.useUtils();

  const mutation = trpc.segnalazioni.create.useMutation({
    onSuccess: async (created) => {
      await utils.segnalazioni.list.invalidate();
      options.onSuccess?.(created.id);
    },
  });

  return {
    createSegnalazione: (draft: DraftReport) => mutation.mutate(buildCreateSegnalazionePayload(draft)),
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

