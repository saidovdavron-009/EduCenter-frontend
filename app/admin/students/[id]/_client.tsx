"use client";
import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, KeyRound, MapPin, Calendar, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatCurrency, formatPhone, getStatusColor, getStatusLabel } from "@/lib/utils";
import { studentsApi } from "@/lib/api";

interface StudentGroup {
  id: string;
  name: string;
  subject_name: string | null;
  teacher_name: string | null;
  joined_at: string;
}

interface StudentDetail {
  id: string;
  fullName: string;
  phone: string;
  parentPhone: string | null;
  email: string | null;
  loginId: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | null;
  address: string | null;
  status: "ACTIVE" | "FROZEN" | "GRADUATED";
  groups: StudentGroup[];
  createdAt: string;
}

interface AttendanceRow {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  date: string;
  note: string | null;
}

interface GradeRow {
  id: string;
  type: string;
  score: number;
  maxScore: number;
  comment: string | null;
  date: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  paidAt: string | null;
}

type TabValue = "payments" | "attendance" | "grades" | "groups";

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = React.useState<TabValue>("payments");

  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.getById(id).then((r) => r.data as StudentDetail),
  });

  const { data: paymentsRes } = useQuery({
    queryKey: ["student-payments", id],
    queryFn: () => studentsApi.getPayments(id).then((r) => r.data as { data: PaymentRow[] }),
  });
  const payments = paymentsRes?.data ?? [];

  const { data: attendanceRes } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: () => studentsApi.getAttendance(id).then((r) => r.data as { data: AttendanceRow[] }),
  });
  const attendances = attendanceRes?.data ?? [];

  const { data: gradesRes } = useQuery({
    queryKey: ["student-grades", id],
    queryFn: () => studentsApi.getGrades(id).then((r) => r.data as { data: GradeRow[] }),
  });
  const grades = gradesRes?.data ?? [];

  const attendanceRate = attendances.length > 0
    ? Math.round((attendances.filter(a => a.status === "PRESENT").length / attendances.length) * 100)
    : 0;
  const overdueCount = payments.filter(p => p.status === "OVERDUE").length;

  const tabs: { value: TabValue; label: string }[] = [
    { value: "payments", label: "To'lovlar" },
    { value: "attendance", label: "Davomat" },
    { value: "grades", label: "Baholar" },
    { value: "groups", label: "Guruhlar" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/students">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold">O'quvchi profili</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <UserAvatar name={student?.fullName || "?"} size="xl" />
              <div>
                <h2 className="font-bold text-lg">{student?.fullName}</h2>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(student?.status || "ACTIVE")}`}>
                  {getStatusLabel(student?.status || "ACTIVE")}
                </span>
              </div>
              <Link href={`/admin/students/${id}/edit`} className="w-full">
                <Button variant="outline" size="sm" className="w-full"><Pencil className="h-3.5 w-3.5" />Tahrirlash</Button>
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" /><span>{student?.phone ? formatPhone(student.phone) : "—"}</span></div>
              {student?.parentPhone && (
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" /><span className="text-[var(--muted-foreground)]">Ota-ona:</span><span>{formatPhone(student.parentPhone)}</span></div>
              )}
              <div className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" /><span className="text-[var(--muted-foreground)]">Login ID:</span><span className="font-mono">{student?.loginId || "—"}</span></div>
              {student?.address && (
                <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" /><span>{student.address}</span></div>
              )}
              {student?.dob && (
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" /><span>{formatDate(student.dob)}</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-[#1E3A5F]">{student?.groups.length ?? 0}</p><p className="text-xs text-[var(--muted-foreground)]">Guruhlar</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{attendanceRate}%</p><p className="text-xs text-[var(--muted-foreground)]">Davomat</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-amber-600">{overdueCount}</p><p className="text-xs text-[var(--muted-foreground)]">Qarzdorlik</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-1 border-b border-[var(--border)] mb-4">
                {tabs.map(t => (
                  <button key={t.value} onClick={() => setActiveTab(t.value)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.value ? "border-[#1E3A5F] text-[#1E3A5F]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {activeTab === "payments" && (
                <Table><TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>Miqdor</TableHead><TableHead>Usul</TableHead><TableHead>Holat</TableHead></TableRow></TableHeader>
                  <TableBody>{payments.map(p => (<TableRow key={p.id}><TableCell>{p.paidAt ? formatDate(p.paidAt) : "—"}</TableCell><TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell><TableCell>{getStatusLabel(p.method)}</TableCell><TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></TableCell></TableRow>))}</TableBody>
                </Table>
              )}
              {activeTab === "attendance" && (
                <Table><TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>Holat</TableHead><TableHead>Izoh</TableHead></TableRow></TableHeader>
                  <TableBody>{attendances.map(a => (<TableRow key={a.id}><TableCell>{formatDate(a.date)}</TableCell><TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(a.status)}`}>{getStatusLabel(a.status)}</span></TableCell><TableCell className="text-[var(--muted-foreground)]">{a.note || "—"}</TableCell></TableRow>))}</TableBody>
                </Table>
              )}
              {activeTab === "grades" && (
                <Table><TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>Tur</TableHead><TableHead>Ball</TableHead><TableHead>Izoh</TableHead></TableRow></TableHeader>
                  <TableBody>{grades.map(g => (<TableRow key={g.id}><TableCell>{formatDate(g.date)}</TableCell><TableCell>{getStatusLabel(g.type)}</TableCell><TableCell className="font-medium">{g.score}/{g.maxScore}</TableCell><TableCell className="text-[var(--muted-foreground)]">{g.comment || "—"}</TableCell></TableRow>))}</TableBody>
                </Table>
              )}
              {activeTab === "groups" && (
                <div className="space-y-2">
                  {(student?.groups ?? []).map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg">
                      <div><p className="font-medium text-sm">{g.name}</p><p className="text-xs text-[var(--muted-foreground)]">{g.subject_name || "—"} · {g.teacher_name || "—"}</p></div>
                      <span className="text-xs text-[var(--muted-foreground)]">{formatDate(g.joined_at)}</span>
                    </div>
                  ))}
                  {(student?.groups ?? []).length === 0 && (
                    <p className="text-center py-8 text-sm text-[var(--muted-foreground)]">Guruhlar yo'q</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}