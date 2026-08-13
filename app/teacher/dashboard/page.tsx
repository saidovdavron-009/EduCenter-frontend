"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, ClipboardCheck, Calendar } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { groupsApi, schedulesApi, gradesApi, attendanceApi } from "@/lib/api";

interface GroupRow { id: string; name: string; capacity: number; currentCount: number; }
interface ScheduleEntry { id: string; groupId: string; groupName: string; startTime: string; endTime: string; room: string | null; studentCount: number; }
interface GradeRow { id: string; studentName: string; type: string; score: number; maxScore: number; date: string; }
interface AttendanceReportRow { present: number; late: number; total: number; }

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function TeacherDashboardPage() {
  const { user } = useAuthStore();
  const teacherId = user?.profile?.id;
  const todayKey = DAY_KEYS[new Date().getDay()];

  const { data: groupsRes } = useQuery({
    queryKey: ["my-groups", teacherId],
    queryFn: () => groupsApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: GroupRow[] }),
    enabled: !!teacherId,
  });
  const myGroups = groupsRes?.data ?? [];

  const { data: weekly } = useQuery({
    queryKey: ["my-weekly-schedule", teacherId],
    queryFn: () => schedulesApi.getWeekly({ teacherId }).then((r) => r.data as Record<string, ScheduleEntry[]>),
    enabled: !!teacherId,
  });
  const todaySchedule = weekly?.[todayKey] ?? [];

  const { data: gradesRes } = useQuery({
    queryKey: ["my-recent-grades", teacherId],
    queryFn: () => gradesApi.getAll({ teacherId, limit: 5 }).then((r) => r.data as { data: GradeRow[] }),
    enabled: !!teacherId,
  });
  const recentGrades = gradesRes?.data ?? [];

  const { data: attendanceStats } = useQuery({
    queryKey: ["my-attendance-avg", myGroups.map((g) => g.id).join(",")],
    queryFn: async () => {
      const reports = await Promise.all(myGroups.map((g) => attendanceApi.getReport({ groupId: g.id }).then((r) => r.data as AttendanceReportRow[])));
      const rows = reports.flat();
      const total = rows.reduce((a, r) => a + r.total, 0);
      const present = rows.reduce((a, r) => a + r.present + r.late, 0);
      return total > 0 ? Math.round((present / total) * 100) : null;
    },
    enabled: myGroups.length > 0,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">
          Xush kelibsiz, {user?.profile?.fullName?.split(" ")[0] || "O'qituvchi"}! 👋
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1" suppressHydrationWarning>
          {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard title="Guruhlarim" value={myGroups.length} icon={<BookOpen className="h-5 w-5" />} iconBg="bg-blue-100" />
        <StatCard title="Jami o'quvchilar" value={myGroups.reduce((s, g) => s + g.currentCount, 0)} icon={<Users className="h-5 w-5" />} iconBg="bg-purple-100" />
        <StatCard title="Bugungi darslar" value={todaySchedule.length} icon={<Calendar className="h-5 w-5" />} iconBg="bg-amber-100" />
        <StatCard title="Davomat (o'rtacha)" value={attendanceStats != null ? `${attendanceStats}%` : "—"} icon={<ClipboardCheck className="h-5 w-5" />} iconBg="bg-green-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Bugungi darslar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {todaySchedule.length === 0 ? (
              <p className="text-[var(--muted-foreground)] text-sm text-center py-8">Bugun dars yo'q</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {todaySchedule.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-24 text-xs font-medium text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-lg px-2 py-1 text-center">
                      {s.startTime}–{s.endTime}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.groupName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{s.room ?? "Xona belgilanmagan"} • {s.studentCount} ta o'quvchi</p>
                    </div>
                    <a href="/teacher/attendance" className="text-xs text-[#1E3A5F] hover:underline">Davomat →</a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Guruhlarim</CardTitle>
              <a href="/teacher/groups" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {myGroups.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-sm">{g.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{g.currentCount}/{g.capacity} o'quvchi</p>
                  </div>
                  <div className="text-right">
                    <div className="w-20 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden ml-auto">
                      <div className="h-full bg-[#1E3A5F]" style={{ width: `${g.capacity > 0 ? (g.currentCount / g.capacity) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{g.capacity > 0 ? Math.round((g.currentCount / g.capacity) * 100) : 0}%</p>
                  </div>
                </div>
              ))}
              {myGroups.length === 0 && <p className="text-[var(--muted-foreground)] text-sm text-center py-8">Guruhlar yo'q</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>So'nggi baholar</CardTitle>
            <a href="/teacher/grades" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {recentGrades.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{g.studentName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{getStatusLabel(g.type)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1E3A5F]">{g.score}/{g.maxScore}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatDate(g.date)}</p>
                </div>
              </div>
            ))}
            {recentGrades.length === 0 && <p className="text-[var(--muted-foreground)] text-sm text-center py-8">Baholar yo'q</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}