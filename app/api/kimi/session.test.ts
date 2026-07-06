import * as jose from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Session } from "@contracts/constants";
import { env } from "../lib/env";
import { signSessionToken, verifySessionToken } from "./session";

function getTestSecret(): Uint8Array {
  const secret =
    env.appSecret ||
    process.env.DEV_APP_SECRET ||
    "dev_local_fallback_secret_change_me";
  return new TextEncoder().encode(secret);
}

describe("session tokens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signs and verifies only the current session version", async () => {
    const clientId = env.appId || "dev";
    const token = await signSessionToken({
      unionId: "user-1",
      clientId,
    });

    await expect(verifySessionToken(token)).resolves.toEqual({
      unionId: "user-1",
      clientId,
      version: Session.version,
    });

    const decoded = jose.decodeJwt(token);
    expect(decoded.version).toBe(Session.version);
    expect(decoded.iss).toBe(Session.issuer);
    expect(decoded.aud).toBe(clientId);
  });

  it("rejects legacy tokens without the current session version", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const clientId = env.appId || "dev";
    const legacyToken = await new jose.SignJWT({
      unionId: "legacy-user",
      clientId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(Session.issuer)
      .setAudience(clientId)
      .setIssuedAt()
      .setExpirationTime("1 hour")
      .sign(getTestSecret());

    await expect(verifySessionToken(legacyToken)).resolves.toBeNull();
  });

  it("rejects tokens issued for a different audience", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const token = await new jose.SignJWT({
      unionId: "user-2",
      clientId: "unexpected-client",
      version: Session.version,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(Session.issuer)
      .setAudience("unexpected-client")
      .setIssuedAt()
      .setExpirationTime("1 hour")
      .sign(getTestSecret());

    await expect(verifySessionToken(token)).resolves.toBeNull();
  });
});
