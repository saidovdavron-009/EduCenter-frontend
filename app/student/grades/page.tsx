"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuthStore } from "@/store/authStore";
import { gradesApi, studentsApi } from "@/lib/api";

type GradeType = "HOMEWORK" | "CLASSWORK" | "TEST" | "EXAM";

interface GradeRow {
  id: string; groupId: string | null; groupName: string | null; type: GradeType; score: number; maxScore: number; date: string; comment: string | null;
}
interface StudentGroup { id: string; name: string; }

const typeBadge: Record<GradeType, "secondary" | "success" | "warning" | "destructive"> = {
  HOMEWORK: "secondary",
  CLASSWORK: "success",
  TEST: "warning",
  EXAM: "destructive",
};

const getScoreColor = (pct: number) => {
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
};

export default function StudentGradesPage() {
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [groupFilter, setGroupFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  const { data: student } = useQuery({
    queryKey: ["my-student-profile", studentId],
    queryFn: () => studentsApi.getById(studentId as string).then((r) => r.data as { groups: { id: string; name: string }[] }),
    enabled: !!studentId,
  });
  const myGroups: StudentGroup[] = student?.groups ?? [];

  const { data } = useQuery({
    queryKey: ["my-grades", studentId, { groupFilter, typeFilter }],
    queryFn: () => gradesApi.getAll({
      studentId,
      groupId: groupFilter === "ALL" ? undefined : groupFilter,
      type: typeFilter === "ALL" ? undefined : typeFilter,
      limit: 100,
    }).then((r) => r.data as { data: GradeRow[]; meta: { total: number } }),
    enabled: !!studentId,
  });
  const grades = data?.data ?? [];

  const avg = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length)
    : 0;
  const best = grades.reduce((b: GradeRow | null, g) => (!b || g.score / g.maxScore > b.score / b.maxScore ? g : b), null);

  const chartData = [...grades].reverse().slice(-10).map((g) => ({
    name: formatDate(g.date).slice(0, 5),
    ball: Math.round((g.score / g.maxScore) * 100),
  }));

  const thisMonthCount = grades.filter((g) => {
    const d = new Date(g.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Baholarim</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">O'zlashtirish ko'rsatkichlari</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">O'rtacha ball</p>
          <p className={`text-2xl font-bold mt-1 ${getScoreColor(avg)}`}>{avg}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Jami baholar</p>
          <p className="text-2xl font-bold mt-1">{grades.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Eng yuqori</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{best ? `${Math.round((best.score / best.maxScore) * 100)}%` : "–"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Bu oy</p>
          <p className="text-2xl font-bold mt-1">{thisMonthCount}</p>
        </CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Ball dinamikasi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, "Ball"]} />
                <Bar dataKey="ball" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Guruh" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barcha guruhlar</SelectItem>
            {myGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Tur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="HOMEWORK">Uyga vazifa</SelectItem>
            <SelectItem value="CLASSWORK">Sinf ishi</SelectItem>
            <SelectItem value="TEST">Test</SelectItem>
            <SelectItem value="EXAM">Imtihon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {grades.map((g) => {
              const pct = Math.round((g.score / g.maxScore) * 100);
              return (
                <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{g.groupName ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={typeBadge[g.type]}>{getStatusLabel(g.type)}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">{formatDate(g.date)}</span>
                      {g.comment && <span className="text-xs text-[var(--muted-foreground)]">• {g.comment}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${getScoreColor(pct)}`}>{g.score}/{g.maxScore}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{pct}%</p>
                  </div>
                </div>
              );
            })}
            {grades.length === 0 && (
              <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}