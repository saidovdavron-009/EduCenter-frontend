"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, studentsApi } from "@/lib/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
interface AttendanceRow { id: string; date: string; groupName: string; groupId?: string; status: AttendanceStatus; }
interface StudentGroup { id: string; name: string; }

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ReactNode; color: string; badgeVariant: "success" | "destructive" | "warning" | "info" }> = {
  PRESENT: { label: "Keldi", icon: <CheckCircle className="h-4 w-4 text-green-600" />, color: "text-green-600", badgeVariant: "success" },
  ABSENT: { label: "Kelmadi", icon: <XCircle className="h-4 w-4 text-red-500" />, color: "text-red-500", badgeVariant: "destructive" },
  LATE: { label: "Kech", icon: <Clock className="h-4 w-4 text-amber-500" />, color: "text-amber-500", badgeVariant: "warning" },
  EXCUSED: { label: "Sababli", icon: <AlertCircle className="h-4 w-4 text-blue-500" />, color: "text-blue-500", badgeVariant: "info" },
};

const PIE_COLORS: Record<AttendanceStatus, string> = { PRESENT: "#22c55e", ABSENT: "#ef4444", LATE: "#f59e0b", EXCUSED: "#3b82f6" };

export default function StudentAttendancePage() {
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [groupFilter, setGroupFilter] = React.useState("ALL");

  const { data: student } = useQuery({
    queryKey: ["my-student-profile", studentId],
    queryFn: () => studentsApi.getById(studentId as string).then((r) => r.data as { groups: { id: string; name: string }[] }),
    enabled: !!studentId,
  });
  const myGroups: StudentGroup[] = student?.groups ?? [];

  const { data } = useQuery({
    queryKey: ["my-attendance", studentId, groupFilter],
    queryFn: () => attendanceApi.getAll({ studentId, groupId: groupFilter === "ALL" ? undefined : groupFilter, limit: 200 })
      .then((r) => r.data as { data: AttendanceRow[]; meta: { total: number } }),
    enabled: !!studentId,
  });
  const records = data?.data ?? [];

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<AttendanceStatus, number>);

  const total = records.length;
  const attendancePct = total ? Math.round((((counts.PRESENT || 0) + (counts.LATE || 0)) / total) * 100) : 0;

  const pieData = (["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[])
    .filter((s) => counts[s] > 0)
    .map((s) => ({ name: statusConfig[s].label, value: counts[s], color: PIE_COLORS[s] }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Davomatim</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Dars qatnashuvim statistikasi</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
          <Card key={s}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                {statusConfig[s].icon}
                <p className="text-xs text-[var(--muted-foreground)]">{statusConfig[s].label}</p>
              </div>
              <p className={`text-2xl font-bold ${statusConfig[s].color}`}>{counts[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Davomat foizi</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--muted)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 40 * attendancePct / 100} ${2 * Math.PI * 40 * (1 - attendancePct / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{attendancePct}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Jami darslar: <span className="font-bold">{total}</span></p>
                <p className="text-sm text-green-600">Keldi: <span className="font-bold">{counts.PRESENT || 0}</span></p>
                <p className="text-sm text-red-500">Kelmadi: <span className="font-bold">{counts.ABSENT || 0}</span></p>
                <p className="text-sm text-amber-500">Kech: <span className="font-bold">{counts.LATE || 0}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Taqsimot</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Ma'lumot yo'q</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Guruh" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barcha guruhlar</SelectItem>
            {myGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Davomat tarixi</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {records.map((r) => {
              const cfg = statusConfig[r.status];
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{r.groupName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(r.date)}</p>
                  </div>
                  <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                </div>
              );
            })}
            {records.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Ma'lumot yo'q</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}