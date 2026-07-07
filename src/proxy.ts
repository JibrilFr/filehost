import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth check needed at the proxy level.
  // Auth protection is handled in Server Components via requireAuth()/requireAdmin().
  // The proxy layer only handles lightweight redirects.

  // If no session cookie exists and trying to access dashboard, redirect to login
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (pathname.startsWith("/dashboard") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only run proxy on dashboard routes
    "/dashboard/:path*",
  ],
};
