import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The session lives in an httpOnly cookie set by the backend on ITS OWN
// domain (e.g. educenter-backend-*.onrender.com) — a different origin from
// this frontend. Browsers never send that cookie on requests to this Vercel
// domain, so Edge Middleware can never read it here; a cookie-based gate at
// this layer always sees "no token" even for a fully logged-in user and
// bounces them straight back to /login. Auth + role gating happens
// client-side instead (components/layout/dashboard-layout.tsx), where the
// persisted Zustand auth state is available and the backend cookie is sent
// correctly on the actual API calls (withCredentials).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy single login link — send it to the admin portal by default.
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
