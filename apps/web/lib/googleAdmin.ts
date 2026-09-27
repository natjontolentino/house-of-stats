import "server-only";

export const GOOGLE_STATE_COOKIE = "admin_google_oauth";

/** Google sign-in is on once its client id and secret are configured; from then on the password login is refused. */
export function googleAdminConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && allowedAdminEmail());
}

/** The one Google account allowed into the admin. */
export function allowedAdminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email ? email : null;
}

export function googleRedirectUri(origin: string): string {
  return `${origin}/api/admin/google/callback`;
}

export interface GoogleIdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
  nonce?: string;
}

/**
 * The id_token comes straight from Google's token endpoint over TLS in exchange
 * for our one-time code and client secret (never from the browser), so per the
 * OpenID Connect spec its signature need not be re-verified -- but its claims
 * must be: issued by Google, for this app, unexpired, and for this login attempt.
 */
export function readVerifiedClaims(idToken: string, expectedNonce: string): GoogleIdTokenClaims | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  let claims: GoogleIdTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audienceOk = claims.aud === process.env.GOOGLE_CLIENT_ID;
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  const nonceOk = claims.nonce === expectedNonce;
  return issuerOk && audienceOk && fresh && nonceOk ? claims : null;
}
