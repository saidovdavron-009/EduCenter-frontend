"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { settingsApi } from "@/lib/api";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, ClipboardCheck,
  CreditCard, BarChart2, FileText, BookMarked, Settings, ChevronLeft,
  Building2, DollarSign, Tag, Package, ClipboardList, ShieldCheck,
  FileSignature, ListTodo, CalendarOff, UserCheck, Phone, DoorOpen, Layers, Contact,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const adminNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: "Boshqaruv",
    items: [
      { label: "O'quvchilar", href: "/admin/students", icon: <Users className="h-4 w-4" /> },
      { label: "O'qituvchilar", href: "/admin/teachers", icon: <GraduationCap className="h-4 w-4" /> },
      { label: "Ota-onalar", href: "/admin/parents", icon: <Contact className="h-4 w-4" /> },
      { label: "Guruhlar", href: "/admin/groups", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Dars jadvali", href: "/admin/schedule", icon: <Calendar className="h-4 w-4" /> },
      { label: "Filiallar", href: "/admin/branches", icon: <Building2 className="h-4 w-4" /> },
      { label: "Fanlar", href: "/admin/subjects", icon: <Layers className="h-4 w-4" /> },
      { label: "Xonalar", href: "/admin/rooms", icon: <DoorOpen className="h-4 w-4" /> },
    ],
  },
  {
    title: "Akademik",
    items: [
      { label: "Davomat", href: "/admin/attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
      { label: "O'qituvchi davomati", href: "/admin/teacher-attendance", icon: <UserCheck className="h-4 w-4" /> },
      { label: "Baholar", href: "/admin/grades", icon: <BookMarked className="h-4 w-4" /> },
      { label: "Uy vazifalari", href: "/admin/homework", icon: <FileText className="h-4 w-4" /> },
      { label: "Materiallar", href: "/admin/materials", icon: <Package className="h-4 w-4" /> },
      { label: "Testlar", href: "/admin/quizzes", icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  {
    title: "Moliya",
    items: [
      { label: "To'lovlar", href: "/admin/finance", icon: <CreditCard className="h-4 w-4" /> },
      { label: "Xarajatlar", href: "/admin/expenses", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Xodimlar maoshlari", href: "/admin/salaries", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Chegirmalar", href: "/admin/discounts", icon: <Tag className="h-4 w-4" /> },
    ],
  },
  {
    title: "CRM & Ombor",
    items: [
      { label: "Lidlar (CRM)", href: "/admin/leads", icon: <Phone className="h-4 w-4" /> },
      { label: "Ombor", href: "/admin/inventory", icon: <Package className="h-4 w-4" /> },
      { label: "Shartnomalar", href: "/admin/contracts", icon: <FileSignature className="h-4 w-4" /> },
    ],
  },
  {
    title: "Tizim",
    items: [
      { label: "Vazifalar", href: "/admin/tasks", icon: <ListTodo className="h-4 w-4" /> },
      { label: "Ta'tillar", href: "/admin/holidays", icon: <CalendarOff className="h-4 w-4" /> },
      { label: "Hisobotlar", href: "/admin/reports", icon: <BarChart2 className="h-4 w-4" /> },
      { label: "Sozlamalar", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

const teacherNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Guruhlarim", href: "/teacher/groups", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Davomat", href: "/teacher/attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
      { label: "Baholar", href: "/teacher/grades", icon: <BookMarked className="h-4 w-4" /> },
      { label: "Uy vazifalari", href: "/teacher/homework", icon: <FileText className="h-4 w-4" /> },
      { label: "Materiallar", href: "/teacher/materials", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
];

const studentNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/student/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Dars jadvali", href: "/student/schedule", icon: <Calendar className="h-4 w-4" /> },
      { label: "Baholarim", href: "/student/grades", icon: <BookMarked className="h-4 w-4" /> },
      { label: "Davomat", href: "/student/attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
      { label: "To'lovlar", href: "/student/payments", icon: <CreditCard className="h-4 w-4" /> },
      { label: "Vazifalar", href: "/student/homework", icon: <FileText className="h-4 w-4" /> },
    ],
  },
];

const parentNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/parent/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Farzandim", href: "/parent/child", icon: <Users className="h-4 w-4" /> },
      { label: "Baholar", href: "/parent/grades", icon: <BookMarked className="h-4 w-4" /> },
      { label: "Davomat", href: "/parent/attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
      { label: "To'lovlar", href: "/parent/payments", icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => settingsApi.getPublicSettings().then((r) => r.data as { data: { center_name: string | null } }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const centerName = publicSettings?.data.center_name || "EduCenter Pro";

  const navGroups = React.useMemo(() => {
    if (!user) return [];
    switch (user.role) {
      case "ADMIN": {
        if (!user.isSuperAdmin) return adminNav;
        // Only the single super admin manages other admin accounts — inserted
        // right before "O'quvchilar" in the "Boshqaruv" group.
        const adminsItem: NavItem = { label: "Adminlar", href: "/admin/admins", icon: <ShieldCheck className="h-4 w-4" /> };
        return adminNav.map((group) =>
          group.title === "Boshqaruv"
            ? { ...group, items: [adminsItem, ...group.items] }
            : group
        );
      }
      case "TEACHER": return teacherNav;
      case "STUDENT": return studentNav;
      case "PARENT": return parentNav;
      default: return [];
    }
  }, [user]);

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    TEACHER: "O'qituvchi",
    STUDENT: "O'quvchi",
    PARENT: "Ota-ona",
  };

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          // Always fixed to the viewport (not a flex sibling) so its height can
          // never be dragged along by the main content's scroll position —
          // margin-left on the content pane (see dashboard-layout.tsx) reserves
          // its space on desktop instead.
          "fixed top-0 left-0 z-30 h-full bg-[#1E3A5F] text-white flex flex-col transition-transform duration-300 ease-in-out",
          // Mobile: full-width drawer slides in/out
          sidebarOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full w-72",
          // Desktop: always visible, collapsible icon/full
          sidebarOpen ? "lg:translate-x-0 lg:w-64" : "lg:translate-x-0 lg:w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
              EP
            </div>
            <div className={cn("min-w-0 transition-all", !sidebarOpen && "lg:hidden")}>
              <p className="font-bold text-sm leading-tight truncate">{centerName}</p>
              <p className="text-xs text-white/60 leading-tight">O'quv Markazi</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-1">
              {group.title && (
                <p className={cn(
                  "px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40",
                  !sidebarOpen && "lg:hidden"
                )}>
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "relative flex items-center mx-2 mb-1 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span className="shrink-0 relative z-10">{item.icon}</span>
                    <span
                      className={cn(
                        "absolute left-10 truncate transition-all duration-150",
                        !sidebarOpen && "lg:opacity-0 lg:translate-x-2 lg:pointer-events-none"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={cn(
                        "ml-auto bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-all duration-150",
                        !sidebarOpen && "lg:opacity-0 lg:pointer-events-none"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "lg:justify-center")}>
            <UserAvatar
              name={user?.profile?.fullName || user?.email || user?.loginId || "U"}
              avatarUrl={user?.avatarUrl ?? user?.profile?.avatarUrl}
              size="sm"
              className="shrink-0 ring-2 ring-white/30"
            />
            <div className={cn("min-w-0 flex-1", !sidebarOpen && "lg:hidden")}>
              {user && (
                <>
                  <p className="text-sm font-medium truncate">{user.profile?.fullName || user.email || user.loginId}</p>
                  <p className="text-xs text-white/60 truncate">{roleLabel[user.role]}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
