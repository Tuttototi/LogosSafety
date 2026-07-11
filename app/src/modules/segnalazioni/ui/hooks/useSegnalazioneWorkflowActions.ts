import { trpc } from "@/providers/trpc";
import type { ReportStatus } from "../types";

async function invalidateSegnalazione(utils: ReturnType<typeof trpc.useUtils>, id: string) {
  await Promise.all([
    utils.segnalazioni.list.invalidate(),
    utils.segnalazioni.byId.invalidate({ id }),
  ]);
}

export function useSegnalazioneWorkflowActions() {
  const utils = trpc.useUtils();

  const addComment = trpc.segnalazioni.addComment.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const requestIntegration = trpc.segnalazioni.requestIntegration.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const integrate = trpc.segnalazioni.integrate.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const takeInCharge = trpc.segnalazioni.takeInCharge.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const changeStatus = trpc.segnalazioni.changeStatus.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const resolve = trpc.segnalazioni.resolve.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const close = trpc.segnalazioni.close.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });
  const acknowledge = trpc.segnalazioni.acknowledge.useMutation({
    onSuccess: async (_result, input) => invalidateSegnalazione(utils, input.id),
  });

  const mutations = [
    addComment,
    requestIntegration,
    integrate,
    takeInCharge,
    changeStatus,
    resolve,
    close,
    acknowledge,
  ];

  return {
    addComment: (input: { id: string; text: string }, onSuccess?: () => void) =>
      addComment.mutate(input, { onSuccess }),
    requestIntegration: (input: { id: string; message: string }, onSuccess?: () => void) =>
      requestIntegration.mutate(input, { onSuccess }),
    integrate: (input: { id: string; message: string }, onSuccess?: () => void) =>
      integrate.mutate(input, { onSuccess }),
    takeInCharge: (input: { id: string }, onSuccess?: () => void) =>
      takeInCharge.mutate(input, { onSuccess }),
    changeStatus: (input: { id: string; targetStatus: ReportStatus }, onSuccess?: () => void) =>
      changeStatus.mutate(input, { onSuccess }),
    resolve: (input: { id: string; resolutionNote: string }, onSuccess?: () => void) =>
      resolve.mutate(input, { onSuccess }),
    close: (input: { id: string; closingNote?: string }, onSuccess?: () => void) =>
      close.mutate(input, { onSuccess }),
    acknowledge: (input: { id: string }, onSuccess?: () => void) =>
      acknowledge.mutate(input, { onSuccess }),
    isPending: mutations.some((mutation) => mutation.isPending),
    error: mutations.find((mutation) => mutation.error)?.error,
  };
}
