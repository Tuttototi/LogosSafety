import { z } from "zod";
import { createRouter, publicQuery, respSicQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { branding } from "@db/schema";
import { eq } from "drizzle-orm";

export const brandingRouter = createRouter({
  get: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.select().from(branding).limit(1);
    if (result.length === 0) {
      return {
        id: 0,
        appName: "Logos Safety",
        logoUrl: null,
        logoWidth: 140,
        faviconUrl: null,
        primaryColor: "#1E40AF",
        primaryHover: "#1E3A8A",
        accentColor: "#3B82F6",
        sidebarBg: "#FFFFFF",
        sidebarText: "#4B5563",
        sidebarActiveBg: "#1E40AF",
        sidebarActiveText: "#FFFFFF",
        topbarBg: "#FFFFFF",
        canvasBg: "#F0F2F5",
        statusGreen: "#059669",
        statusYellow: "#D97706",
        statusRed: "#DC2626",
        updatedAt: new Date(),
      };
    }
    return result[0];
  }),

  upsert: respSicQuery
    .input(
      z.object({
        appName: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
        logoWidth: z.number().optional(),
        faviconUrl: z.string().nullable().optional(),
        primaryColor: z.string().optional(),
        primaryHover: z.string().optional(),
        accentColor: z.string().optional(),
        sidebarBg: z.string().optional(),
        sidebarText: z.string().optional(),
        sidebarActiveBg: z.string().optional(),
        sidebarActiveText: z.string().optional(),
        topbarBg: z.string().optional(),
        canvasBg: z.string().optional(),
        statusGreen: z.string().optional(),
        statusYellow: z.string().optional(),
        statusRed: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(branding).limit(1);
      if (existing.length === 0) {
        await db.insert(branding).values({
          appName: input.appName ?? "Logos Safety", logoUrl: input.logoUrl ?? null,
          logoWidth: input.logoWidth ?? 140, faviconUrl: input.faviconUrl ?? null,
          primaryColor: input.primaryColor ?? "#1E40AF", primaryHover: input.primaryHover ?? "#1E3A8A",
          accentColor: input.accentColor ?? "#3B82F6", sidebarBg: input.sidebarBg ?? "#FFFFFF",
          sidebarText: input.sidebarText ?? "#4B5563", sidebarActiveBg: input.sidebarActiveBg ?? "#1E40AF",
          sidebarActiveText: input.sidebarActiveText ?? "#FFFFFF", topbarBg: input.topbarBg ?? "#FFFFFF",
          canvasBg: input.canvasBg ?? "#F0F2F5", statusGreen: input.statusGreen ?? "#059669",
          statusYellow: input.statusYellow ?? "#D97706", statusRed: input.statusRed ?? "#DC2626",
        });
      } else {
        const updateData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) updateData[key] = value;
        }
        await db.update(branding).set(updateData).where(eq(branding.id, existing[0].id));
      }
      await logAudit(ctx, "update", "branding", { module: "impostazioni" });
      return { success: true };
    }),
});
