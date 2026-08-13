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
import { parentsApi, attendanceApi } from "@/lib/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
interface ChildOption { id: string; fullName: string; }
interface AttendanceRow { id: string; groupName: string; date: string; status: AttendanceStatus; }

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ReactNode; color: string; variant: "success" | "destructive" | "warning" | "info" }> = {
  PRESENT: { label: "Keldi", icon: <CheckCircle className="h-4 w-4 text-green-600" />, color: "text-green-600", variant: "success" },
  ABSENT: { label: "Kelmadi", icon: <XCircle className="h-4 w-4 text-red-500" />, color: "text-red-500", variant: "destructive" },
  LATE: { label: "Kech", icon: <Clock className="h-4 w-4 text-amber-500" />, color: "text-amber-500", variant: "warning" },
  EXCUSED: { label: "Sababli", icon: <AlertCircle className="h-4 w-4 text-blue-500" />, color: "text-blue-500", variant: "info" },
};
const PIE_COLORS: Record<AttendanceStatus, string> = { PRESENT: "#22c55e", ABSENT: "#ef4444", LATE: "#f59e0b", EXCUSED: "#3b82f6" };

export default function ParentAttendancePage() {
  const { user } = useAuthStore();
  const parentId = user?.profile?.id;
  const [selectedChild, setSelectedChild] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("ALL");

  const { data: parent } = useQuery({
    queryKey: ["my-parent-profile", parentId],
    queryFn: () => parentsApi.getById(parentId as string).then((r) => r.data as { students: ChildOption[] }),
    enabled: !!parentId,
  });
  const children = parent?.students ?? [];

  React.useEffect(() => {
    if (!selectedChild && children.length > 0) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const { data } = useQuery({
    queryKey: ["child-attendance-full", selectedChild],
    queryFn: () => attendanceApi.getAll({ studentId: selectedChild, limit: 200 }).then((r) => r.data as { data: AttendanceRow[] }),
    enabled: !!selectedChild,
  });
  const allRecords = data?.data ?? [];
  const groupNames = Array.from(new Set(allRecords.map((r) => r.groupName)));
  const records = allRecords.filter((r) => groupFilter === "ALL" || r.groupName === groupFilter);

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<AttendanceStatus, number>);
  const total = records.length;
  const pct = total ? Math.round((((counts.PRESENT || 0) + (counts.LATE || 0)) / total) * 100) : 0;

  const pieData = (["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[])
    .filter((s) => counts[s] > 0)
    .map((s) => ({ name: statusConfig[s].label, value: counts[s], color: PIE_COLORS[s] }));

  const child = children.find((c) => c.id === selectedChild);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Farzandim davomati</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{child?.fullName ?? "—"} — dars qatnashuvi</p>
        </div>
        {children.length > 1 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
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
                    strokeDasharray={`${2 * Math.PI * 40 * pct / 100} ${2 * Math.PI * 40 * (1 - pct / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{pct}%</span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium">Jami darslar: <span className="font-bold">{total}</span></p>
                <p className="text-green-600">Keldi: <span className="font-bold">{counts.PRESENT || 0}</span></p>
                <p className="text-red-500">Kelmadi: <span className="font-bold">{counts.ABSENT || 0}</span></p>
                <p className="text-amber-500">Kech keldi: <span className="font-bold">{counts.LATE || 0}</span></p>
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
            {groupNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
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
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
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
