"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Users, CreditCard, ClipboardCheck } from "lucide-react";
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { reportsApi, groupsApi } from "@/lib/api";

interface RevenuePoint { month: string; revenue: number; expenses: number; profit: number; }
interface StudentsReport { total: number; active: number; frozen: number; graduated: number; newThisMonth: number; topStudents: { id: string; fullName: string; avgScore: string }[]; }
interface AttendanceStats { present: number; absent: number; late: number; excused: number; percentage: number; }
interface GroupRow { id: string; subjectName: string | null; currentCount: number; }

const PERIOD_MONTHS: Record<string, number> = { "1month": 1, "3months": 3, "6months": 6, "1year": 12 };
const SUBJECT_COLORS = ["#1E3A5F", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function ReportsPage() {
  const [period, setPeriod] = React.useState("6months");
  const monthsCount = PERIOD_MONTHS[period];
  const now = new Date();
  const currentYear = now.getFullYear();

  const { data: revenueData = [] } = useQuery({
    queryKey: ["reports-revenue", currentYear],
    queryFn: () => reportsApi.getRevenue({ year: currentYear }).then((r) => r.data as RevenuePoint[]),
  });
  const slicedRevenue = revenueData.slice(Math.max(0, now.getMonth() + 1 - monthsCount), now.getMonth() + 1);
  const totalRevenue = slicedRevenue.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = slicedRevenue.reduce((s, r) => s + r.profit, 0);

  const { data: studentsReport } = useQuery({
    queryKey: ["reports-students"],
    queryFn: () => reportsApi.getStudentReport({}).then((r) => r.data as StudentsReport),
  });

  const trendMonths = React.useMemo(() => {
    const count = Math.min(monthsCount, 6);
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
      return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString("uz-UZ", { month: "short" }) };
    });
  }, [monthsCount]);

  const { data: attendanceTrend = [] } = useQuery({
    queryKey: ["reports-attendance-trend", trendMonths],
    queryFn: () =>
      Promise.all(
        trendMonths.map((m) =>
          reportsApi.getAttendanceReport({ month: m.month, year: m.year }).then((r) => ({ month: m.label, rate: (r.data as AttendanceStats).percentage })),
        ),
      ),
  });
  const avgAttendance = attendanceTrend.length > 0 ? Math.round(attendanceTrend.reduce((s, a) => s + a.rate, 0) / attendanceTrend.length) : 0;

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupRow[] }),
  });
  const subjectPopularity = React.useMemo(() => {
    const groups = groupsRes?.data ?? [];
    const bySubject = new Map<string, number>();
    for (const g of groups) {
      const name = g.subjectName || "Boshqa";
      bySubject.set(name, (bySubject.get(name) || 0) + Number(g.currentCount || 0));
    }
    return Array.from(bySubject.entries())
      .map(([name, students], i) => ({ name, students, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }))
      .filter((s) => s.students > 0)
      .sort((a, b) => b.students - a.students);
  }, [groupsRes]);

  const topStudents = studentsReport?.topStudents ?? [];

  const handlePdfExport = () => window.print();

  const handleExcelExport = () => {
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [];

    lines.push("Moliyaviy ko'rsatkichlar");
    lines.push(["Oy", "Daromad", "Xarajat", "Foyda"].map(escape).join(","));
    for (const r of slicedRevenue) lines.push([r.month, r.revenue, r.expenses, r.profit].map(escape).join(","));
    lines.push("");

    lines.push("Fan mashhurligi");
    lines.push(["Fan", "O'quvchilar soni"].map(escape).join(","));
    for (const s of subjectPopularity) lines.push([s.name, s.students].map(escape).join(","));
    lines.push("");

    lines.push("Davomat tendensiyasi");
    lines.push(["Oy", "Foiz"].map(escape).join(","));
    for (const a of attendanceTrend) lines.push([a.month, a.rate].map(escape).join(","));
    lines.push("");

    lines.push("Eng yaxshi o'quvchilar");
    lines.push(["O'rin", "F.I.O", "O'rtacha ball"].map(escape).join(","));
    topStudents.forEach((s, i) => lines.push([i + 1, s.fullName, s.avgScore].map(escape).join(",")));

    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Hisobotlar va Analitika</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Tizim statistikasi va hisobotlar</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 oy</SelectItem>
              <SelectItem value="3months">3 oy</SelectItem>
              <SelectItem value="6months">6 oy</SelectItem>
              <SelectItem value="1year">1 yil</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePdfExport}><Download className="h-4 w-4" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleExcelExport}><Download className="h-4 w-4" />Excel</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard title="Jami daromad" value={formatCurrency(totalRevenue)} icon={<CreditCard className="h-5 w-5" />} iconBg="bg-green-100" />
        <StatCard title="Yangi o'quvchilar" value={studentsReport?.newThisMonth ?? 0} icon={<Users className="h-5 w-5" />} iconBg="bg-blue-100" subtitle="shu oy" />
        <StatCard title="O'rtacha davomat" value={`${avgAttendance}%`} icon={<ClipboardCheck className="h-5 w-5" />} iconBg="bg-amber-100" />
        <StatCard title="Sof foyda" value={formatCurrency(totalProfit)} icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-purple-100" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle>Moliyaviy ko'rsatkichlar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={slicedRevenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => {
                    const abs = Math.abs(v);
                    const sign = v < 0 ? "-" : "";
                    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
                    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}k`;
                    return `${v}`;
                  }}
                />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Daromad" stroke="#1E3A5F" fill="url(#rev)" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" name="Foyda" stroke="#22c55e" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Popularity */}
        <Card>
          <CardHeader><CardTitle>Fan mashhurligi</CardTitle></CardHeader>
          <CardContent>
            {subjectPopularity.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-16">Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={subjectPopularity} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="students">
                    {subjectPopularity.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} o'quvchi`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance Trend */}
        <Card>
          <CardHeader><CardTitle>Davomat tendensiyasi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Davomat"]} />
                <Line type="monotone" dataKey="rate" stroke="#1E3A5F" strokeWidth={2} dot={{ fill: "#1E3A5F" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader><CardTitle>Eng yaxshi o'quvchilar</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topStudents.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Ma'lumot yo'q</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.fullName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1E3A5F]">{s.avgScore}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">o'rtacha</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}