import { describe, expect, it } from "vitest";
import { Session } from "@contracts/constants";
import type { User } from "@db/schema";
import { authRouter } from "./auth-router";

const testUser: User = {
  id: 1,
  unionId: "test-user",
  name: "Test User",
  email: "test@example.com",
  avatar: null,
  role: "admin",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignInAt: new Date(),
  createdBy: null,
};

describe("auth logout", () => {
  it("expires the current and every legacy session cookie", async () => {
    const resHeaders = new Headers();
    const caller = authRouter.createCaller({
      req: new Request("http://localhost/api/trpc/auth.logout"),
      resHeaders,
      user: testUser,
    });

    await expect(caller.logout()).resolves.toEqual({ success: true });

    const setCookie = resHeaders.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${Session.cookieName}=`);
    for (const legacyCookieName of Session.legacyCookieNames) {
      expect(setCookie).toContain(`${legacyCookieName}=`);
    }
    expect(setCookie.match(/Max-Age=0/g)?.length).toBe(
      1 + Session.legacyCookieNames.length,
    );
  });
});
