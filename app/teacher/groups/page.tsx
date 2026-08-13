"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { formatCurrency, getStatusColor, getStatusLabel, getDayShort } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { groupsApi, attendanceApi } from "@/lib/api";
import Link from "next/link";

interface GroupRow {
  id: string; name: string; subjectName: string | null; capacity: number;
  monthlyFee: number; status: string; currentCount: number;
}
interface GroupDetail extends GroupRow {
  students: { id: string; fullName: string }[];
  schedules: { id: string; dayOfWeek: string; startTime: string; endTime: string; room: string | null }[];
}
interface AttendanceReportRow { studentId: string; percentage: number; }

export default function TeacherGroupsPage() {
  const { user } = useAuthStore();
  const teacherId = user?.profile?.id;
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["my-groups", teacherId],
    queryFn: () => groupsApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: GroupRow[] }),
    enabled: !!teacherId,
  });
  const myGroups = data?.data ?? [];

  const { data: detail } = useQuery({
    queryKey: ["group-detail", selectedGroup],
    queryFn: () => groupsApi.getById(selectedGroup as string).then((r) => r.data as GroupDetail),
    enabled: !!selectedGroup,
  });

  const { data: attReport } = useQuery({
    queryKey: ["group-attendance-report", selectedGroup],
    queryFn: () => attendanceApi.getReport({ groupId: selectedGroup }).then((r) => r.data as AttendanceReportRow[]),
    enabled: !!selectedGroup,
  });
  const attMap = React.useMemo(() => new Map((attReport ?? []).map((r) => [r.studentId, r.percentage])), [attReport]);

  const scheduleLabel = (g: GroupDetail | undefined) => {
    if (!g?.schedules?.length) return "Jadval belgilanmagan";
    const days = g.schedules.map((s) => getDayShort(s.dayOfWeek)).join(", ");
    return `${days} — ${g.schedules[0].startTime}–${g.schedules[0].endTime}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Guruhlarim</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Mening guruhlarim ro'yxati</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {myGroups.map((g) => (
          <Card key={g.id} className={`hover:shadow-md transition-shadow cursor-pointer ${selectedGroup === g.id ? "ring-2 ring-[#1E3A5F]" : ""}`}
            onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{g.name}</CardTitle>
                    <p className="text-xs text-[var(--muted-foreground)]">{g.subjectName ?? "—"}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(g.status)}`}>
                  {getStatusLabel(g.status)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                  <Users className="h-3.5 w-3.5" />
                  <span>{g.currentCount}/{g.capacity} o'quvchi</span>
                </div>
                <span className="font-medium">{formatCurrency(g.monthlyFee)}/oy</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                <div className="h-full bg-[#1E3A5F]" style={{ width: `${g.capacity > 0 ? (g.currentCount / g.capacity) * 100 : 0}%` }} />
              </div>
              {selectedGroup === g.id && detail && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{scheduleLabel(detail)}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Link href={`/teacher/attendance?group=${g.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs">Davomat</Button>
                </Link>
                <Link href={`/teacher/grades?group=${g.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs">Baholar</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {myGroups.length === 0 && (
          <div className="col-span-full text-center text-[var(--muted-foreground)] py-12">Guruhlar yo'q</div>
        )}
      </div>

      {selectedGroup && detail && (
        <Card>
          <CardHeader>
            <CardTitle>{detail.name} — O'quvchilar ro'yxati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.students.map((s) => {
                const pct = attMap.get(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={s.fullName} size="sm" />
                      <span className="text-sm font-medium">{s.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[var(--muted-foreground)]">Davomat:</span>
                        <span className={`font-bold ${(pct ?? 0) >= 80 ? "text-green-600" : "text-red-500"}`}>{pct ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {detail.students.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-6">O'quvchilar yo'q</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}