import { authRouter } from "./auth-router";
import { dashboardRouter } from "./dashboard-router";
import { workersRouter } from "./workers-router";
import { trainingRouter } from "./training-router";
import { medicalRouter } from "./medical-router";
import { complianceRouter } from "./compliance-router";
import { settingsRouter } from "./settings-router";
import { brandingRouter } from "./branding-router";
import { documentRouter } from "./document-router";
import { auditRouter } from "./audit-router";
import { importRouter } from "./import-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  dashboard: dashboardRouter,
  workers: workersRouter,
  training: trainingRouter,
  medical: medicalRouter,
  compliance: complianceRouter,
  settings: settingsRouter,
  branding: brandingRouter,
  documents: documentRouter,
  audit: auditRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;
