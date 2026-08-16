"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

// Login pages live under /admin and /student (so they can be role-restricted by
// the middleware) but must render standalone — no Sidebar/Header/notifications
// calls, since there's no session yet at that point.
const LOGIN_PATHS = ["/admin/login", "/student/login"];

// Mirrors the role gate that used to live in middleware.ts — see that file
// for why it moved here (the session cookie isn't readable at the edge).
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["ADMIN", "TEACHER"],
  "/student": ["ADMIN", "STUDENT"],
  "/parent": ["ADMIN", "PARENT"],
};

function getLoginRouteForPath(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/student/login";
}

function getRoleHome(role: string): string {
  switch (role) {
    case "ADMIN": return "/admin/dashboard";
    case "TEACHER": return "/teacher/dashboard";
    case "STUDENT": return "/student/dashboard";
    case "PARENT": return "/parent/dashboard";
    default: return "/admin/login";
  }
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = LOGIN_PATHS.includes(pathname);
  const { user, isAuthenticated, hasHydrated, hydrateProfile } = useAuthStore();

  // Auth + role gating now happens here instead of middleware.ts, since the
  // backend's httpOnly session cookie lives on a different domain and is
  // never visible to Edge Middleware running on this frontend's domain.
  React.useEffect(() => {
    if (isLoginPage || !hasHydrated) return;

    if (!isAuthenticated || !user) {
      const loginUrl = new URL(getLoginRouteForPath(pathname), window.location.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      router.replace(loginUrl.pathname + loginUrl.search);
      return;
    }

    for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        if (!allowedRoles.includes(user.role)) {
          router.replace(getRoleHome(user.role));
        }
        break;
      }
    }
  }, [isLoginPage, hasHydrated, isAuthenticated, user, pathname, router]);

  // Sessions started before this fix (or ADMIN accounts, which never carry a
  // nested profile from login) are missing profile.fullName — backfill it once.
  React.useEffect(() => {
    if (!isLoginPage && user && !user.profile?.fullName) {
      authApi.getProfile().then(({ data }) => hydrateProfile(data)).catch(() => {});
    }
  }, [isLoginPage, user, hydrateProfile]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Still rehydrating persisted auth state, or the redirect effect above is
  // about to fire — render nothing rather than flash protected content.
  if (!hasHydrated || !isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] bg-[var(--background)] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
