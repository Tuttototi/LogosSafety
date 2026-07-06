import * as jose from "jose";
import { Session } from "@contracts/constants";
import { env } from "../lib/env";
import type { SessionIdentity, SessionPayload } from "./types";

const JWT_ALG = "HS256";

function getExpectedAudience(): string {
  return env.appId || "dev";
}

function getSigningSecret(): Uint8Array {
  const fallback = "dev_local_fallback_secret_change_me";
  const secretStr =
    env.appSecret ||
    (env.isProduction ? "" : process.env.DEV_APP_SECRET || fallback);
  if (!secretStr) {
    throw new Error("Missing APP_SECRET in production environment");
  }
  return new TextEncoder().encode(secretStr);
}

export async function signSessionToken(
  payload: SessionIdentity
): Promise<string> {
  const secret = getSigningSecret();
  return new jose.SignJWT({
    ...payload,
    version: Session.version,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuer(Session.issuer)
    .setAudience(getExpectedAudience())
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1000) + Session.maxAgeMs / 1000,
    )
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  if (!token) {
    console.warn("[session] No token provided for verification.");
    return null;
  }
  try {
    const secret = getSigningSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
      issuer: Session.issuer,
      audience: getExpectedAudience(),
    });
    const { unionId, clientId, version } = payload;
    if (
      !unionId ||
      !clientId ||
      version !== Session.version ||
      clientId !== getExpectedAudience()
    ) {
      console.warn("[session] JWT payload missing required fields.");
      return null;
    }
    return { unionId, clientId, version } as SessionPayload;
  } catch (error) {
    console.warn("[session] JWT verification failed:", error);
    return null;
  }
}
