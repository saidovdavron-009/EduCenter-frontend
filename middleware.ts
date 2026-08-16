import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Two portals: admin logs in at /admin/login, everyone else (teacher/student/parent)
// at /student/login. Each dedicated login page itself rejects roles it doesn't own,
// but must still be publicly reachable (no token) for anyone to land on it.
const PUBLIC_ROUTES = ["/admin/login", "/student/login"];
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["ADMIN", "TEACHER"],
  "/student": ["ADMIN", "STUDENT"],
  "/parent": ["ADMIN", "PARENT"],
};

function getLoginRouteForPath(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/student/login";
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy single login link — send it to the admin portal by default.
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token =
    request.cookies.get("accessToken")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    const loginUrl = new URL(getLoginRouteForPath(pathname), request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = parseJwt(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    const loginUrl = new URL(getLoginRouteForPath(pathname), request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role: string = payload.role;

  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(getRoleHome(role), request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

function getRoleHome(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/admin/login";
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};