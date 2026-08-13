"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardCheck, CreditCard, BookMarked } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { formatDate, formatCurrency, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { parentsApi, studentsApi, gradesApi, paymentsApi, attendanceApi } from "@/lib/api";

interface ChildOption { id: string; fullName: string; }
interface StudentGroup { id: string; name: string; }
interface GradeRow { id: string; groupName: string | null; type: string; score: number; maxScore: number; date: string; }
interface PaymentRow { id: string; groupName: string | null; amount: number; status: string; dueDate: string | null; }
interface AttendanceReportRow { percentage: number; }

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const parentId = user?.profile?.id;

  const { data: parent } = useQuery({
    queryKey: ["my-parent-profile", parentId],
    queryFn: () => parentsApi.getById(parentId as string).then((r) => r.data as { students: ChildOption[] }),
    enabled: !!parentId,
  });
  const children = parent?.students ?? [];
  const child = children[0];

  const { data: student } = useQuery({
    queryKey: ["child-detail", child?.id],
    queryFn: () => studentsApi.getById(child!.id).then((r) => r.data as { groups: StudentGroup[] }),
    enabled: !!child,
  });
  const groups = student?.groups ?? [];

  const { data: gradesRes } = useQuery({
    queryKey: ["child-grades", child?.id],
    queryFn: () => gradesApi.getAll({ studentId: child!.id, limit: 100 }).then((r) => r.data as { data: GradeRow[] }),
    enabled: !!child,
  });
  const grades = gradesRes?.data ?? [];
  const avgScore = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length) : null;

  const { data: attPct } = useQuery({
    queryKey: ["child-attendance-report", child?.id],
    queryFn: () => attendanceApi.getReport({ studentId: child!.id }).then((r) => (r.data as AttendanceReportRow[])[0]?.percentage ?? null),
    enabled: !!child,
  });

  const { data: paymentsRes } = useQuery({
    queryKey: ["child-payments", child?.id],
    queryFn: () => paymentsApi.getAll({ studentId: child!.id, limit: 5 }).then((r) => r.data as { data: PaymentRow[] }),
    enabled: !!child,
  });
  const payments = paymentsRes?.data ?? [];
  const hasUnpaid = payments.some((p) => p.status !== "PAID");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Xush kelibsiz!</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1" suppressHydrationWarning>
          {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {child ? (
        <>
          <Card className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8e] text-white">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <UserAvatar name={child.fullName} size="lg" className="ring-2 ring-white/30" />
                <div>
                  <h2 className="font-bold text-lg">{child.fullName}</h2>
                  <p className="text-white/70 text-sm">{groups.map((g) => g.name).join(", ") || "Guruhlar yo'q"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatCard title="Davomat" value={attPct != null ? `${attPct}%` : "—"} icon={<ClipboardCheck className="h-5 w-5" />} iconBg="bg-green-100" />
            <StatCard title="O'rtacha ball" value={avgScore != null ? `${avgScore}%` : "—"} icon={<BookMarked className="h-5 w-5" />} iconBg="bg-purple-100" />
            <StatCard title="Guruhlar" value={groups.length} icon={<BookOpen className="h-5 w-5" />} iconBg="bg-blue-100" />
            <StatCard title="To'lov" value={hasUnpaid ? "Kutilmoqda" : "To'langan"} icon={<CreditCard className="h-5 w-5" />} iconBg="bg-amber-100" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>So'nggi baholar</CardTitle>
                  <a href="/parent/grades" className="text-xs text-[#1E3A5F] hover:underline">Batafsil →</a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {grades.slice(0, 5).map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1">
                        <p className="text-sm">{g.groupName ?? "—"} — {getStatusLabel(g.type)}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(g.date)}</p>
                      </div>
                      <p className="font-bold text-sm text-[#1E3A5F]">{g.score}/{g.maxScore}</p>
                    </div>
                  ))}
                  {grades.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>To'lovlar</CardTitle>
                  <a href="/parent/payments" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-medium text-sm">{p.groupName ?? "—"}</p>
                        {p.dueDate && <p className="text-xs text-[var(--muted-foreground)]">Muddat: {formatDate(p.dueDate)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                        <Badge variant={p.status === "PAID" ? "success" : "warning"}>{p.status === "PAID" ? "To'langan" : "Kutilmoqda"}</Badge>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">To'lovlar yo'q</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-center text-[var(--muted-foreground)] py-12">Bog'langan farzand topilmadi</p>
      )}
    </div>
  );
}