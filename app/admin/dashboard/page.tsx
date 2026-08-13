"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, GraduationCap, BookOpen, CreditCard, ClipboardCheck,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { reportsApi, studentsApi, paymentsApi } from "@/lib/api";
import type { DashboardStats, RevenueData, AttendanceStats } from "@/types";

interface RecentStudent {
  id: string; fullName: string; phone: string; status: string; createdAt: string;
}

interface RecentPayment {
  id: string; studentName: string; amount: number; method: string; status: string; paidAt: string | null;
}

const placeholderStats: DashboardStats = {
  totalStudents: 0, activeStudents: 0, totalTeachers: 0, totalGroups: 0,
  monthlyRevenue: 0, pendingPayments: 0, todayAttendanceRate: 0, totalAttendanceRate: 0,
};

const ATTENDANCE_COLORS: Record<string, string> = {
  Keldi: "#22c55e", Kelmadi: "#ef4444", Kech: "#f59e0b", Sababli: "#8b5cf6",
};

function toAttendancePie(stats?: AttendanceStats) {
  if (!stats) return [];
  return [
    { name: "Keldi", value: stats.present },
    { name: "Kelmadi", value: stats.absent },
    { name: "Kech", value: stats.late },
    { name: "Sababli", value: stats.excused },
  ];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 shadow-lg text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboardStats().then((r) => r.data as DashboardStats),
    placeholderData: placeholderStats,
  });

  const { data: revenueData } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => reportsApi.getRevenue().then((r) => r.data as RevenueData[]),
    placeholderData: [] as RevenueData[],
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["dashboard-attendance"],
    queryFn: () => reportsApi.getAttendanceReport().then((r) => r.data as AttendanceStats),
  });

  const { data: recentStudentsRes } = useQuery({
    queryKey: ["dashboard-recent-students"],
    queryFn: () => studentsApi.getAll({ limit: 4 }).then((r) => r.data as { data: RecentStudent[] }),
  });

  const { data: recentPaymentsRes } = useQuery({
    queryKey: ["dashboard-recent-payments"],
    queryFn: () => paymentsApi.getAll({ limit: 4 }).then((r) => r.data as { data: RecentPayment[] }),
  });

  const recentStudents = recentStudentsRes?.data ?? [];
  const recentPayments = recentPaymentsRes?.data ?? [];
  const attendancePie = toAttendancePie(attendanceStats);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1" suppressHydrationWarning>
          {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Jami o'quvchilar"
          value={stats?.totalStudents ?? 0}
          subtitle={`${stats?.activeStudents ?? 0} aktiv`}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="O'qituvchilar"
          value={stats?.totalTeachers ?? 0}
          subtitle={`${stats?.totalGroups ?? 0} guruh`}
          icon={<GraduationCap className="h-5 w-5" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Oylik daromad"
          value={formatCurrency(stats?.monthlyRevenue ?? 0)}
          subtitle={`${formatCurrency(stats?.pendingPayments ?? 0)} kutilmoqda`}
          icon={<CreditCard className="h-5 w-5" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Davomat bugun"
          value={`${stats?.todayAttendanceRate ?? 0}%`}
          subtitle={`O'rtacha: ${stats?.totalAttendanceRate ?? 0}%`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          iconBg="bg-amber-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Daromad dinamikasi</CardTitle>
              <Badge variant="success">{new Date().getFullYear()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-5">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Daromad" stroke="#1E3A5F" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Foyda" stroke="#22c55e" fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Davomat holati</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-5">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={attendancePie}
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {attendancePie.map((entry) => (
                    <Cell key={entry.name} fill={ATTENDANCE_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, ""]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Recent Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Yangi o'quvchilar</CardTitle>
              <a href="/admin/students" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {recentStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3">
                  <UserAvatar name={student.fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{student.fullName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{student.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(student.status)}`}>
                      {getStatusLabel(student.status)}
                    </span>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 hidden sm:block">{formatDate(student.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">So'nggi to'lovlar</CardTitle>
              <a href="/admin/finance" className="text-xs text-[#1E3A5F] hover:underline">Barchasi →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]">
                    <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{payment.studentName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{getStatusLabel(payment.method)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
