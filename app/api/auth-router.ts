import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery } from "./middleware";
import { createCoreIdentityService } from "./core/identity";

export const authRouter = createRouter({
  me: authedQuery.query(async (opts) => {
    const actor = await createCoreIdentityService().resolveActorContext(opts.ctx.user);
    return {
      ...opts.ctx.user,
      tenantId: actor.tenantId,
      companyId: actor.companyId,
      personId: actor.personId,
      permissions: actor.permissions,
      organizationalScope: actor.organizationalScope,
      scopes: actor.scopes,
    };
  }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    for (const cookieName of [
      Session.cookieName,
      ...Session.legacyCookieNames,
    ]) {
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(cookieName, "", {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 0,
        }),
      );
    }
    return { success: true };
  }),
});
