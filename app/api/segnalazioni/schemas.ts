import { z } from "zod";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  StatoSegnalazione,
  TipoSegnalazione,
} from "@/modules/segnalazioni/domain";

const nonEmptyString = z.string().trim().min(1).max(64);
const workflowTextSchema = z.string().trim().min(1).max(2000);
const prioritySchema = z.enum([
  PrioritaSegnalazione.Bassa,
  PrioritaSegnalazione.Media,
  PrioritaSegnalazione.Alta,
  PrioritaSegnalazione.Critica,
]);
const severitySchema = z.enum([
  GravitaSegnalazione.Bassa,
  GravitaSegnalazione.Media,
  GravitaSegnalazione.Alta,
  GravitaSegnalazione.Critica,
]);
const categorySchema = z.enum([
  CategoriaSegnalazione.Sicurezza,
  CategoriaSegnalazione.Ambiente,
  CategoriaSegnalazione.Attrezzature,
  CategoriaSegnalazione.Procedura,
  CategoriaSegnalazione.Altro,
]);
const typeSchema = z.enum([
  TipoSegnalazione.Pericolo,
  TipoSegnalazione.Incidente,
  TipoSegnalazione.NearMiss,
  TipoSegnalazione.NonConformita,
  TipoSegnalazione.Suggerimento,
]);
const statusSchema = z.enum([
  StatoSegnalazione.Nuova,
  StatoSegnalazione.PresaInCarico,
  StatoSegnalazione.InLavorazione,
  StatoSegnalazione.RichiestaIntegrazione,
  StatoSegnalazione.Integrata,
  StatoSegnalazione.Risolta,
  StatoSegnalazione.Chiusa,
]);
const periodDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const scopeInputSchema = z.object({
  contractId: nonEmptyString.optional(),
  siteId: nonEmptyString.optional(),
  plantId: nonEmptyString.optional(),
  areaId: nonEmptyString.optional(),
}).strict();

export const createSegnalazioneInputSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(5000),
  priority: prioritySchema,
  severity: severitySchema,
  category: categorySchema,
  type: typeSchema,
  organizationalScope: scopeInputSchema.optional(),
}).strict();

export const listSegnalazioniInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  createdByMe: z.boolean().optional(),
  createdFrom: periodDateSchema.optional(),
  createdTo: periodDateSchema.optional(),
  organizationalScope: scopeInputSchema.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}).strict().refine(
  (input) => !input.createdFrom || !input.createdTo || input.createdFrom <= input.createdTo,
  {
    message: "createdFrom must be before or equal to createdTo",
    path: ["createdTo"],
  },
).optional();

export const byIdSegnalazioneInputSchema = z.object({
  id: nonEmptyString,
}).strict();

export const addCommentInputSchema = z.object({
  id: nonEmptyString,
  text: workflowTextSchema,
}).strict();

export const requestIntegrationInputSchema = z.object({
  id: nonEmptyString,
  message: workflowTextSchema,
}).strict();

export const integrateInputSchema = z.object({
  id: nonEmptyString,
  message: workflowTextSchema,
}).strict();

export const takeInChargeInputSchema = z.object({
  id: nonEmptyString,
}).strict();

export const changeStatusInputSchema = z.object({
  id: nonEmptyString,
  targetStatus: statusSchema,
}).strict();

export const resolveInputSchema = z.object({
  id: nonEmptyString,
  resolutionNote: workflowTextSchema,
}).strict();

export const closeInputSchema = z.object({
  id: nonEmptyString,
  closingNote: z.string().trim().max(2000).optional(),
}).strict();

export const acknowledgeInputSchema = z.object({
  id: nonEmptyString,
}).strict();

export type CreateSegnalazioneApiInput = z.infer<typeof createSegnalazioneInputSchema>;
export type ListSegnalazioniApiInput = z.infer<typeof listSegnalazioniInputSchema>;
export type ScopeApiInput = z.infer<typeof scopeInputSchema>;
