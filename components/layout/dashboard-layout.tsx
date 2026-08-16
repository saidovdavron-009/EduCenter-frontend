"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
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

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = LOGIN_PATHS.includes(pathname);
  const { user, hydrateProfile } = useAuthStore();

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
