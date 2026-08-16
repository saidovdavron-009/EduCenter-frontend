"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Menu, Bell, Search, Sun, Moon, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn, getLoginRoute } from "@/lib/utils";
import { notificationsApi } from "@/lib/api";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { toggleSidebar, theme, setTheme } = useUIStore();
  const { user, logout } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ["header-notifications"],
    queryFn: () => notificationsApi.getAll({ limit: 1 }).then((r) => r.data as { meta: { unreadCount: number } }),
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.meta?.unreadCount ?? 0;

  const handleLogout = () => {
    const loginRoute = getLoginRoute(user?.role);
    logout();
    router.push(loginRoute);
  };

  const getRoleProfile = () => {
    switch (user?.role) {
      case "ADMIN": return "/admin/profile";
      case "TEACHER": return "/teacher/profile";
      case "STUDENT": return "/student/profile";
      case "PARENT": return "/parent/profile";
      default: return getLoginRoute(user?.role);
    }
  };

  const getRoleNotifications = () => {
    switch (user?.role) {
      case "ADMIN": return "/admin/notifications";
      case "TEACHER": return "/teacher/notifications";
      case "STUDENT": return "/student/notifications";
      case "PARENT": return "/parent/notifications";
      default: return getLoginRoute(user?.role);
    }
  };

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    TEACHER: "O'qituvchi",
    STUDENT: "O'quvchi",
    PARENT: "Ota-ona",
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md px-4 lg:px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
        <Menu className="h-5 w-5" />
      </Button>

      {title && (
        <h1 className="font-semibold text-[var(--foreground)] text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">{title}</h1>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-[var(--muted-foreground)]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[var(--muted-foreground)]"
          onClick={() => router.push(getRoleNotifications())}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--muted)] transition-colors">
              <UserAvatar
                name={user?.profile?.fullName || user?.email || user?.loginId || "U"}
                avatarUrl={user?.avatarUrl ?? user?.profile?.avatarUrl}
                size="sm"
              />
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate max-w-[120px]">
                  {user?.profile?.fullName || user?.email || user?.loginId}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {user?.role ? roleLabel[user.role] : ""}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)] hidden sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                "z-50 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              )}
            >
              <div className="px-3 py-2 mb-1 border-b border-[var(--border)]">
                <p className="text-sm font-medium">{user?.profile?.fullName || user?.email || user?.loginId}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{user?.email || (user?.loginId ? `ID: ${user.loginId}` : "")}</p>
              </div>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-[var(--muted)] outline-none"
                onClick={() => router.push(getRoleProfile())}
              >
                <User className="h-4 w-4" />
                Profil
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-[var(--muted)] outline-none"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-4 w-4" />
                Sozlamalar
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 outline-none"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Chiqish
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
