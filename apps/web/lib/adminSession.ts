/**
 * Minimal session check for the admin data-entry form. There's one
 * organizer (the user) and one league, so this deliberately isn't the full
 * spec 11.2 accounts system (per-organizer email/password, multiple
 * organizers, roles) -- that's real Phase 2 work. This is a single shared
 * password gating a signed session cookie.
 *
 * Uses Web Crypto (crypto.subtle) rather than Node's `crypto` module
 * because this needs to run in both the Edge middleware and the Node
 * server-action runtime, and Web Crypto is the one API both support.
 */
const COOKIE_NAME = "admin_session";
const SESSION_MESSAGE = "admin-session-v1";

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value a successful login sets. Not the password itself -- a fixed proof of knowing ADMIN_SESSION_SECRET, so a leaked cookie can't be used to recover the real password. */
export async function computeSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return hmacHex(SESSION_MESSAGE, secret);
}

export async function isValidSessionCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await computeSessionToken();
  return value === expected;
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return typeof expected === "string" && expected.length > 0 && password === expected;
}

export { COOKIE_NAME };
