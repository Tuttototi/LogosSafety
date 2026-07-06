export const Session = {
  cookieName: "logos_sid_v2",
  legacyCookieNames: ["kimi_sid"],
  version: 2,
  issuer: "logos-safety",
  maxAgeMs: 12 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;
