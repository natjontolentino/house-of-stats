import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionCookie, COOKIE_NAME } from "./lib/adminSession";

/** Gates every /admin page except the login page itself behind the signed session cookie (lib/adminSession.ts). */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSessionCookie(cookie);
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
