import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { buildSegnalazioniActor } from "./actor";
import {
  createSegnalazioniDependencies,
  type SegnalazioniApiDependencies,
  type SegnalazioniDependencyFactory,
} from "./dependencies";
import { DrizzleOrganizationalScopeRepository } from "../core/organizational-scope";
import {
  toSegnalazioneDetailDto,
  toSegnalazioneListItemDto,
  type SegnalazioneListItemDto,
} from "./dto";
import { mapUnexpectedSegnalazioniError, unwrapResult } from "./error-mapper";
import {
  acknowledgeInputSchema,
  addCommentInputSchema,
  byIdSegnalazioneInputSchema,
  changeStatusInputSchema,
  closeInputSchema,
  createSegnalazioneInputSchema,
  integrateInputSchema,
  listSegnalazioniInputSchema,
  requestIntegrationInputSchema,
  resolveInputSchema,
  takeInChargeInputSchema,
  type ListSegnalazioniApiInput,
} from "./schemas";
import type { Segnalazione } from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";
import {
  OperationalScopeErrorCode,
  createListAccessibleOperationalScopeUseCase,
  createResolveOperationalScopeUseCase,
  type OperationalScopeResult,
  type OrganizationalScopeRepository,
  type ResolvedOperationalScope,
} from "@/modules/core/application/organizational-scope";
import type { TrpcContext } from "../context";
import { CoreIdentityError, CoreIdentityErrorCode } from "../core/identity";

type NormalizedListSegnalazioniApiInput = NonNullable<ListSegnalazioniApiInput>;
export type SegnalazioniActorResolver = (ctx: TrpcContext) => Promise<ApplicationActor>;
export type OrganizationalScopeRepositoryFactory = (ctx: TrpcContext) => OrganizationalScopeRepository;

async function defaultActorResolver(ctx: TrpcContext): Promise<ApplicationActor> {
  if (!ctx.user) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.IdentityNotFound,
      "Authenticated user is required",
    );
  }

  return buildSegnalazioniActor(ctx.user);
}

function bySortValue(report: SegnalazioneListItemDto, sortBy: "createdAt" | "updatedAt" | "priority" | "status"): string {
  return String(report[sortBy]);
}

function sortReports(
  reports: SegnalazioneListItemDto[],
  sortBy: "createdAt" | "updatedAt" | "priority" | "status",
  sortDirection: "asc" | "desc",
): SegnalazioneListItemDto[] {
  return [...reports].sort((left, right) => {
    const comparison = bySortValue(left, sortBy).localeCompare(bySortValue(right, sortBy));
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

function defaultScopeRepositoryFactory(): OrganizationalScopeRepository {
  return new DrizzleOrganizationalScopeRepository();
}

function unwrapOperationalScopeResult(
  result: OperationalScopeResult<ResolvedOperationalScope>,
): ResolvedOperationalScope {
  if (result.success) return result.data;

  throw new TRPCError({
    code: result.error.code === OperationalScopeErrorCode.Forbidden ? "FORBIDDEN" : "BAD_REQUEST",
    message: result.error.message,
  });
}

async function toDetailResponse(
  deps: SegnalazioniApiDependencies,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
) {
  const [acknowledgedByCurrentUser, acknowledgements] = await Promise.all([
    deps.hasAcknowledgement({ actor, id: segnalazione.id }),
    deps.listAcknowledgements({ actor, id: segnalazione.id }),
  ]);

  return toSegnalazioneDetailDto(segnalazione, {
    actor,
    acknowledgedByCurrentUser,
    acknowledgements,
  });
}

export function createSegnalazioniRouter(
  dependencyFactory: SegnalazioniDependencyFactory = createSegnalazioniDependencies,
  actorResolver: SegnalazioniActorResolver = defaultActorResolver,
  scopeRepositoryFactory: OrganizationalScopeRepositoryFactory = defaultScopeRepositoryFactory,
) {
  return createRouter({
    availableScope: authedQuery.query(async ({ ctx }) => {
      try {
        const actor = await actorResolver(ctx);
        const repository = scopeRepositoryFactory(ctx);
        return createListAccessibleOperationalScopeUseCase(repository)(actor);
      } catch (error) {
        mapUnexpectedSegnalazioniError(error);
      }
    }),

    create: authedQuery
      .input(createSegnalazioneInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const scopeRepository = scopeRepositoryFactory(ctx);
          const organizationalScope = unwrapOperationalScopeResult(
            await createResolveOperationalScopeUseCase(scopeRepository)(actor, input.organizationalScope),
          );
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.createSegnalazione({
            actor,
            title: input.title,
            description: input.description,
            priority: input.priority,
            severity: input.severity,
            category: input.category,
            type: input.type,
            organizationalScope,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    list: authedQuery
      .input(listSegnalazioniInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const normalizedInput: NormalizedListSegnalazioniApiInput = input ?? {};
          const page = normalizedInput.page ?? 1;
          const pageSize = normalizedInput.pageSize ?? 20;
          const sortBy = normalizedInput.sortBy ?? "createdAt";
          const sortDirection = normalizedInput.sortDirection ?? "desc";
          const deps = dependencyFactory(ctx);
          const organizationalScope = normalizedInput.organizationalScope
            ? unwrapOperationalScopeResult(
              await createResolveOperationalScopeUseCase(scopeRepositoryFactory(ctx))(actor, normalizedInput.organizationalScope),
            )
            : undefined;

          const visibleReports: Segnalazione[] = unwrapResult(await deps.listVisibleSegnalazioni({
            actor,
            organizationalScope,
          }));

          const filteredReports = visibleReports.filter((report) => {
            if (normalizedInput.status && report.status !== normalizedInput.status) return false;
            if (normalizedInput.priority && report.priority !== normalizedInput.priority) return false;
            if (
              normalizedInput.createdByMe === true &&
              report.createdByUserId !== actor.userId &&
              report.createdByPersonId !== actor.personId &&
              report.reporter.userId !== actor.userId &&
              report.reporter.personId !== actor.personId
            ) {
              return false;
            }

            return true;
          });

          const sortedReports = sortReports(filteredReports.map(toSegnalazioneListItemDto), sortBy, sortDirection);
          const offset = (page - 1) * pageSize;

          return {
            items: sortedReports.slice(offset, offset + pageSize),
            total: sortedReports.length,
            page,
            pageSize,
          };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    byId: authedQuery
      .input(byIdSegnalazioneInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.getSegnalazioneById({
            actor,
            id: input.id,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    addComment: authedQuery
      .input(addCommentInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const comment = unwrapResult(await deps.addComment({
            actor,
            id: input.id,
            text: input.text,
          }));

          return { comment };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    requestIntegration: authedQuery
      .input(requestIntegrationInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.requestIntegration({
            actor,
            id: input.id,
            reason: input.message,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    integrate: authedQuery
      .input(integrateInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.integrateSegnalazione({
            actor,
            id: input.id,
            text: input.message,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    takeInCharge: authedQuery
      .input(takeInChargeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.takeInChargeSegnalazione({
            actor,
            id: input.id,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    changeStatus: authedQuery
      .input(changeStatusInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.changeSegnalazioneStatus({
            actor,
            id: input.id,
            status: input.targetStatus,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    resolve: authedQuery
      .input(resolveInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.resolveSegnalazione({
            actor,
            id: input.id,
            resolution: input.resolutionNote,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    close: authedQuery
      .input(closeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.closeSegnalazione({
            actor,
            id: input.id,
            note: input.closingNote,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    acknowledge: authedQuery
      .input(acknowledgeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const acknowledgement = unwrapResult(await deps.acknowledgeSegnalazione({
            actor,
            id: input.id,
          }));

          return {
            acknowledged: true,
            acknowledgedAt: acknowledgement.acknowledgedAt,
          };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),
  });
}

export const segnalazioniRouter = createSegnalazioniRouter();
