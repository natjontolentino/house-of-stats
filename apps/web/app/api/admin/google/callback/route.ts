import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  allowedAdminEmail,
  googleAdminConfigured,
  googleRedirectUri,
  readVerifiedClaims,
} from "../../../../../lib/googleAdmin";
import { computeSessionToken, COOKIE_NAME } from "../../../../../lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Logging-only, non-verifying decode -- used purely to print why verification failed. */
function decodeClaimsForLogging(idToken: string): unknown {
  try {
    return JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return "unparseable";
  }
}

/** Finishes Google sign-in: only the one allowed, verified Google account gets an admin session. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/admin/login?error=${reason}`, origin));
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    return res;
  };

  if (!googleAdminConfigured()) return fail("notconfigured");
  if (req.nextUrl.searchParams.get("error")) return fail("cancelled");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const [savedState, nonce] = saved?.split(".") ?? [];
  if (!code || !state || !savedState || !nonce || state !== savedState) return fail("state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    console.error("[admin-google] token exchange failed", tokenRes.status, await tokenRes.text());
    return fail("google");
  }
  const { id_token: idToken } = (await tokenRes.json()) as { id_token?: string };
  if (!idToken) {
    console.error("[admin-google] token response had no id_token");
    return fail("google");
  }

  const claims = readVerifiedClaims(idToken, nonce);
  if (!claims) {
    console.error("[admin-google] claims failed verification", JSON.stringify(decodeClaimsForLogging(idToken)));
    return fail("google");
  }
  if (claims.email_verified !== true || claims.email?.toLowerCase() !== allowedAdminEmail()) {
    return fail("account");
  }

  const res = NextResponse.redirect(new URL("/admin", origin));
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  res.cookies.set(COOKIE_NAME, await computeSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
