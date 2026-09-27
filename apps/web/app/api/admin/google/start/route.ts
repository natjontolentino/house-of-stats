import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { GOOGLE_STATE_COOKIE, googleAdminConfigured, googleRedirectUri } from "../../../../../lib/googleAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends the browser to Google's account chooser. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!googleAdminConfigured()) {
    return NextResponse.redirect(new URL("/admin/login?error=notconfigured", origin));
  }

  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(24).toString("hex");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${nonce}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/admin/google",
    maxAge: 60 * 10,
  });
  return res;
}
