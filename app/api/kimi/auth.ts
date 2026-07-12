import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "./session";
import { users as kimiUsers } from "./platform";
import { findUserByUnionId, upsertUser } from "../queries/users";
import type { TokenResponse } from "./types";
import {
  assertDevIdentitySelectionAllowed,
  getUatIdentity,
  seedSegnalazioniUatUsers,
} from "../dev/segnalazioni-uat-users";
import { getDevLoginRedirectHash } from "@/lib/auth-routing";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clearLegacySessionCookies(
  c: Context,
  cookieOpts: ReturnType<typeof getSessionCookieOptions>,
) {
  for (const cookieName of Session.legacyCookieNames) {
    setCookie(c, cookieName, "", {
      ...cookieOpts,
      maxAge: 0,
    });
  }
}

async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.appId,
    redirect_uri: redirectUri,
    client_secret: env.appSecret,
  });

  const resp = await fetch(`${env.kimiAuthUrl}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

async function verifyAccessToken(
  accessToken: string
): Promise<{ userId: string; clientId: string }> {
  if (!env.kimiAuthUrl) {
    throw new Error("KIMI_AUTH_URL is not configured");
  }

  let jwks: ReturnType<typeof jose.createRemoteJWKSet>;
  try {
    const base = env.kimiAuthUrl.replace(/\/+$/, "");
    const jwksUrl = new URL(`${base}/api/.well-known/jwks.json`);
    jwks = jose.createRemoteJWKSet(jwksUrl);
  } catch (error: unknown) {
    throw new Error(`Invalid KIMI_AUTH_URL for JWKS: ${getErrorMessage(error)}`);
  }

  const { payload } = await jose.jwtVerify(accessToken, jwks);
  const userId = payload.user_id as string;
  const clientId = payload.client_id as string;
  if (!userId) {
    throw new Error("user_id missing from access token");
  }
  return { userId, clientId };
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    console.warn("[auth] No session cookie found in request.");
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user || !user.active) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      return c.json({ error, error_description: errorDescription }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    try {
      const redirectUri = atob(state);
      const tokenResp = await exchangeAuthCode(code, redirectUri);
      const { userId } = await verifyAccessToken(tokenResp.access_token);
      const userProfile = await kimiUsers.getProfile(tokenResp.access_token);
      if (!userProfile) {
        throw new Error("Failed to fetch user profile from Kimi Open");
      }

      await upsertUser({
        unionId: userId,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        unionId: userId,
        clientId: env.appId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });
      clearLegacySessionCookies(c, cookieOpts);

      return c.redirect("/", 302);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  };
}

type DevLoginEnvironment = Pick<
  typeof env,
  "appId" | "databaseUrl" | "devAuthEnabled" | "isProduction"
>;

type DevLoginHandlerDependencies = {
  authEnv?: DevLoginEnvironment;
  seedUatUsers?: (options: { databaseUrl?: string }) => Promise<unknown>;
  signToken?: typeof signSessionToken;
};

type DevLoginErrorCode =
  | "DEV_DATABASE_UNAVAILABLE"
  | "DEV_UAT_FIXTURE_NOT_FOUND"
  | "DEV_UAT_IDENTITY_INVALID"
  | "DEV_UAT_LOGIN_FAILED";

function classifyDevLoginError(error: unknown): DevLoginErrorCode {
  const message = getErrorMessage(error);

  if (message.includes("Unsupported DEV identity")) {
    return "DEV_UAT_IDENTITY_INVALID";
  }

  if (
    /Access denied|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|getaddrinfo|connect|DATABASE_URL|DEV_DATABASE_URL|database host|local port|logos_safety database/i
      .test(message)
  ) {
    return "DEV_DATABASE_UNAVAILABLE";
  }

  if (
    /UAT .* was not created|fixture|worker was not created|user was not created|company was not created|scope/i
      .test(message)
  ) {
    return "DEV_UAT_FIXTURE_NOT_FOUND";
  }

  return "DEV_UAT_LOGIN_FAILED";
}

export function createDevLoginHandler(
  dependencies: DevLoginHandlerDependencies = {},
) {
  return async (c: Context) => {
    const currentEnv = dependencies.authEnv ?? env;
    const seedUatUsers = dependencies.seedUatUsers ?? seedSegnalazioniUatUsers;
    const signToken = dependencies.signToken ?? signSessionToken;

    if (!currentEnv.devAuthEnabled || currentEnv.isProduction) {
      return c.json({ error: "Not available in production" }, 404);
    }

    try {
      assertDevIdentitySelectionAllowed({
        devAuthEnabled: currentEnv.devAuthEnabled,
        isProduction: currentEnv.isProduction,
      });
      const identity = getUatIdentity(c.req.query("identity"));
      await seedUatUsers({ databaseUrl: currentEnv.databaseUrl });

      const token = await signToken({
        unionId: identity.unionId,
        clientId: currentEnv.appId || "dev",
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });
      clearLegacySessionCookies(c, cookieOpts);

      return c.redirect(getDevLoginRedirectHash(identity.role), 302);
    } catch (error) {
      const code = classifyDevLoginError(error);
      console.error(`[DEV auth] ${code}: ${getErrorMessage(error)}`);
      return c.json({ error: code }, 500);
    }
  };
}

export { exchangeAuthCode, verifyAccessToken };
