"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardCheck, CreditCard, BookMarked } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { studentsApi, gradesApi, paymentsApi, attendanceApi, schedulesApi } from "@/lib/api";

interface StudentGroup { id: string; name: string; subject_name: string | null; teacher_name: string | null; }
interface GradeRow { id: string; teacherName: string | null; type: string; score: number; maxScore: number; date: string; }
interface PaymentRow { id: string; groupId: string; amount: number; status: string; dueDate: string | null; }
interface AttendanceReportRow { percentage: number; }
interface ScheduleEntry { id: string; groupId: string; groupName: string; startTime: string; endTime: string; room: string | null; }

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const firstName = user?.profile?.fullName?.split(" ")[0] || "O'quvchi";
  const todayKey = DAY_KEYS[new Date().getDay()];

  const { data: student } = useQuery({
    queryKey: ["my-student-profile", studentId],
    queryFn: () => studentsApi.getById(studentId as string).then((r) => r.data as { groups: StudentGroup[] }),
    enabled: !!studentId,
  });
  const myGroups = student?.groups ?? [];

  const { data: gradesRes } = useQuery({
    queryKey: ["my-recent-grades", studentId],
    queryFn: () => gradesApi.getAll({ studentId, limit: 5 }).then((r) => r.data as { data: GradeRow[] }),
    enabled: !!studentId,
  });
  const recentGrades = gradesRes?.data ?? [];
  const avgScore = recentGrades.length
    ? Math.round(recentGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / recentGrades.length)
    : null;

  const { data: paymentsRes } = useQuery({
    queryKey: ["my-payments", studentId],
    queryFn: () => paymentsApi.getAll({ studentId, limit: 5 }).then((r) => r.data as { data: PaymentRow[] }),
    enabled: !!studentId,
  });
  const payments = paymentsRes?.data ?? [];
  const hasOverdue = payments.some((p) => p.status === "OVERDUE" || p.status === "PENDING");

  const { data: attReport } = useQuery({
    queryKey: ["my-attendance-report", studentId],
    queryFn: () => attendanceApi.getReport({ studentId }).then((r) => (r.data as AttendanceReportRow[])[0]?.percentage ?? null),
    enabled: !!studentId,
  });

  const { data: todaySchedule = [] } = useQuery({
    queryKey: ["my-today-schedule", myGroups.map((g) => g.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(myGroups.map((g) => schedulesApi.getWeekly({ groupId: g.id }).then((r) => r.data as Record<string, ScheduleEntry[]>)));
      return results.flatMap((weekly) => weekly[todayKey] ?? []);
    },
    enabled: myGroups.length > 0,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Xush kelibsiz, {firstName}!</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1" suppressHydrationWarning>
          {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard title="Guruhlarim" value={myGroups.length} icon={<BookOpen className="h-5 w-5" />} iconBg="bg-blue-100" />
        <StatCard title="Davomat" value={attReport != null ? `${attReport}%` : "—"} icon={<ClipboardCheck className="h-5 w-5" />} iconBg="bg-green-100" />
        <StatCard title="O'rtacha ball" value={avgScore != null ? `${avgScore}%` : "—"} icon={<BookMarked className="h-5 w-5" />} iconBg="bg-purple-100" />
        <StatCard title="To'lov holati" value={hasOverdue ? "Kutilmoqda" : "To'langan"} icon={<CreditCard className="h-5 w-5" />} iconBg="bg-amber-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Bugungi darslar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {todaySchedule.length === 0 ? (
              <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Bugun dars yo'q</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {todaySchedule.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-24 text-xs font-medium text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-lg px-2 py-1 text-center">
                      {s.startTime}–{s.endTime}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.groupName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{s.room ?? "Xona belgilanmagan"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>To'lovlar</CardTitle>
              <a href="/student/payments" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">{p.dueDate ? `Muddat: ${formatDate(p.dueDate)}` : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                    <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                      {p.status === "PAID" ? "To'langan" : "Kutilmoqda"}
                    </Badge>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">To'lovlar yo'q</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>So'nggi baholar</CardTitle>
            <a href="/student/grades" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {recentGrades.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{getStatusLabel(g.type)}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{g.teacherName ?? "—"} • {formatDate(g.date)}</p>
                </div>
                <p className="font-bold text-base text-[#1E3A5F]">{g.score}/{g.maxScore}</p>
              </div>
            ))}
            {recentGrades.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}