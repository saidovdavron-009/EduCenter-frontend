"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuthStore } from "@/store/authStore";
import { parentsApi, gradesApi } from "@/lib/api";

type GradeType = "HOMEWORK" | "CLASSWORK" | "TEST" | "EXAM";
interface ChildOption { id: string; fullName: string; }
interface GradeRow { id: string; groupId: string | null; groupName: string | null; type: GradeType; score: number; maxScore: number; date: string; }

const typeBadge: Record<GradeType, "secondary" | "success" | "warning" | "destructive"> = {
  HOMEWORK: "secondary", CLASSWORK: "success", TEST: "warning", EXAM: "destructive",
};

const getScoreColor = (pct: number) => {
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
};

export default function ParentGradesPage() {
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
    queryKey: ["child-grades-full", selectedChild],
    queryFn: () => gradesApi.getAll({ studentId: selectedChild, limit: 200 }).then((r) => r.data as { data: GradeRow[] }),
    enabled: !!selectedChild,
  });
  const allGrades = data?.data ?? [];
  const groupOptions = Array.from(new Map(allGrades.filter((g) => g.groupId).map((g) => [g.groupId as string, g.groupName ?? "—"])).entries());
  const filtered = allGrades.filter((g) => groupFilter === "ALL" || g.groupId === groupFilter);

  const avg = filtered.length ? Math.round(filtered.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / filtered.length) : 0;
  const chartData = [...filtered].reverse().slice(-10).map((g) => ({ name: formatDate(g.date).slice(0, 5), ball: Math.round((g.score / g.maxScore) * 100) }));

  const child = children.find((c) => c.id === selectedChild);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Farzandim baholari</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{child?.fullName ?? "—"} — o'zlashtirish ko'rsatkichlari</p>
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

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">O'rtacha ball</p>
          <p className={`text-2xl font-bold mt-1 ${getScoreColor(avg)}`}>{avg}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Jami baholar</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Guruhlar</p>
          <p className="text-2xl font-bold mt-1">{groupOptions.length}</p>
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

      <div className="flex gap-3">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Guruh" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barcha guruhlar</SelectItem>
            {groupOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((g) => {
              const pct = Math.round((g.score / g.maxScore) * 100);
              return (
                <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{g.groupName ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={typeBadge[g.type]}>{getStatusLabel(g.type)}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">{formatDate(g.date)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${getScoreColor(pct)}`}>{g.score}/{g.maxScore}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{pct}%</p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
