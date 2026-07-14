import { describe, expect, it, vi } from "vitest";
import type { User } from "@db/schema";
import { Role } from "@/modules/core/domain";

const resolveActorContext = vi.fn();

vi.mock("./core/identity", () => ({
  createCoreIdentityService: () => ({
    resolveActorContext,
  }),
}));

const { adminIdentityRouter } = await import("./admin-identity-router");

const now = new Date("2026-07-14T10:00:00.000Z");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    unionId: "test-user",
    name: "Test User",
    email: "test.user@example.test",
    avatar: null,
    role: "segnalatore",
    active: true,
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
    createdBy: null,
    ...overrides,
  };
}

function makeCaller(user = makeUser()) {
  return adminIdentityRouter.createCaller({
    req: new Request("http://localhost/api/trpc"),
    resHeaders: new Headers(),
    user,
  });
}

describe("Admin identity RBAC", () => {
  it("blocks non Admin users from assigning roles", async () => {
    resolveActorContext.mockResolvedValueOnce({
      active: true,
      role: Role.Segnalatore,
      companyId: "2",
      userId: "10",
    });

    await expect(
      makeCaller().assignRole({ personId: 1, role: "segnalatore" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
