"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { parentsApi, studentsApi, gradesApi, attendanceApi } from "@/lib/api";

interface ChildOption { id: string; fullName: string; }
interface StudentDetail {
  fullName: string; phone: string; dob: string | null; gender: "MALE" | "FEMALE" | null;
  groups: { id: string; name: string; subject_name: string | null; teacher_name: string | null }[];
}
interface GradeRow { id: string; groupId: string | null; groupName: string | null; type: string; score: number; maxScore: number; date: string; }
interface AttendanceRow { id: string; groupName: string; date: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; }
interface AttendanceReportRow { groupId?: string; present: number; late: number; total: number; }

const attendanceBadge: Record<string, "success" | "destructive" | "warning" | "info"> = {
  PRESENT: "success", ABSENT: "destructive", LATE: "warning", EXCUSED: "info",
};
const attendanceLabel: Record<string, string> = {
  PRESENT: "Keldi", ABSENT: "Kelmadi", LATE: "Kech keldi", EXCUSED: "Sababli",
};

const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
};

export default function ParentChildPage() {
  const { user } = useAuthStore();
  const parentId = user?.profile?.id;
  const [tab, setTab] = React.useState<"overview" | "grades" | "attendance">("overview");
  const [selectedChild, setSelectedChild] = React.useState<string>("");

  const { data: parent } = useQuery({
    queryKey: ["my-parent-profile", parentId],
    queryFn: () => parentsApi.getById(parentId as string).then((r) => r.data as { students: ChildOption[] }),
    enabled: !!parentId,
  });
  const children = parent?.students ?? [];

  React.useEffect(() => {
    if (!selectedChild && children.length > 0) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const { data: student } = useQuery({
    queryKey: ["child-detail", selectedChild],
    queryFn: () => studentsApi.getById(selectedChild).then((r) => r.data as StudentDetail),
    enabled: !!selectedChild,
  });

  const { data: gradesRes } = useQuery({
    queryKey: ["child-grades", selectedChild],
    queryFn: () => gradesApi.getAll({ studentId: selectedChild, limit: 100 }).then((r) => r.data as { data: GradeRow[] }),
    enabled: !!selectedChild,
  });
  const grades = gradesRes?.data ?? [];

  const { data: attRes } = useQuery({
    queryKey: ["child-attendance", selectedChild],
    queryFn: () => attendanceApi.getAll({ studentId: selectedChild, limit: 100 }).then((r) => r.data as { data: AttendanceRow[] }),
    enabled: !!selectedChild && tab === "attendance",
  });
  const attendance = attRes?.data ?? [];

  const { data: attByGroup = [] } = useQuery({
    queryKey: ["child-attendance-report", selectedChild],
    queryFn: () => attendanceApi.getReport({ studentId: selectedChild }).then((r) => r.data as AttendanceReportRow[]),
    enabled: !!selectedChild,
  });
  const overallPct = attByGroup.length
    ? Math.round((attByGroup.reduce((s, r) => s + r.present + r.late, 0) / attByGroup.reduce((s, r) => s + r.total, 0)) * 100) || 0
    : 0;

  const groupAvg = (groupId: string) => {
    const gGrades = grades.filter((g) => g.groupId === groupId);
    return gGrades.length ? Math.round(gGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / gGrades.length) : null;
  };

  const child = children.find((c) => c.id === selectedChild);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Farzandim</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">O'quvchi profili va ko'rsatkichlari</p>
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

      {!child ? (
        <p className="text-center text-[var(--muted-foreground)] py-12">Bog'langan farzand topilmadi</p>
      ) : (
        <>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4">
                <UserAvatar name={child.fullName} size="xl" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{child.fullName}</h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--muted-foreground)]">
                    {student?.gender && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{student.gender === "MALE" ? "Erkak" : "Ayol"}</span>}
                    {student?.dob && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(student.dob)}</span>}
                    {student?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{student.phone}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-1 border-b border-[var(--border)]">
            {(["overview", "grades", "attendance"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-[#1E3A5F] text-[#1E3A5F]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
                {t === "overview" ? "Umumiy" : t === "grades" ? "Baholar" : "Davomat"}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(student?.groups ?? []).map((g) => (
                <Card key={g.id}>
                  <CardHeader><CardTitle className="text-sm">{g.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                      <User className="h-3.5 w-3.5" />
                      <span>{g.teacher_name ?? "—"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-[var(--muted-foreground)]">Davomat</p>
                        <p className="text-lg font-bold text-green-600 mt-0.5">{overallPct}%</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-[var(--muted-foreground)]">O'rtacha ball</p>
                        <p className="text-lg font-bold text-blue-600 mt-0.5">{groupAvg(g.id) ?? "—"}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!student?.groups || student.groups.length === 0) && <p className="text-sm text-[var(--muted-foreground)] col-span-2 text-center py-8">Guruhlar yo'q</p>}
            </div>
          )}

          {tab === "grades" && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {grades.map((g) => (
                    <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{g.groupName ?? "—"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{getStatusLabel(g.type)} • {formatDate(g.date)}</p>
                      </div>
                      <p className={`font-bold text-base ${getScoreColor(g.score, g.maxScore)}`}>{g.score}/{g.maxScore}</p>
                    </div>
                  ))}
                  {grades.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "attendance" && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {attendance.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.groupName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(a.date)}</p>
                      </div>
                      <Badge variant={attendanceBadge[a.status]}>{attendanceLabel[a.status]}</Badge>
                    </div>
                  ))}
                  {attendance.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Ma'lumot yo'q</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}