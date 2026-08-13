"use client";
import React from "react";
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

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, hydrateProfile } = useAuthStore();

  // Sessions started before this fix (or ADMIN accounts, which never carry a
  // nested profile from login) are missing profile.fullName — backfill it once.
  React.useEffect(() => {
    if (user && !user.profile?.fullName) {
      authApi.getProfile().then(({ data }) => hydrateProfile(data)).catch(() => {});
    }
  }, [user, hydrateProfile]);

  return (
    <div className="flex h-[100dvh] bg-[var(--background)] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
