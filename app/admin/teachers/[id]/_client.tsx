"use client";
import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, KeyRound, BookOpen, Users, Edit, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { teachersApi, gradesApi } from "@/lib/api";

interface TeacherGroup {
  id: string;
  name: string;
  subject_name: string | null;
  status: string;
  student_count: string | number;
}

interface TeacherDetail {
  id: string;
  fullName: string;
  email: string | null;
  loginId: string | null;
  phone: string;
  subjects: string[];
  experience: number | null;
  salaryType: "MONTHLY" | "HOURLY";
  salary: number;
  isActive: boolean;
  bio: string | null;
  hireDate: string | null;
  groups: TeacherGroup[];
}

interface GradeRow {
  id: string;
  studentName: string;
  type: string;
  score: number;
  maxScore: number;
  date: string;
}

const typeLabels: Record<string, string> = { TEST: "Test", HOMEWORK: "Uyga vazifa", EXAM: "Imtihon", CLASSWORK: "Sinfda ish" };

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: teacher } = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => teachersApi.getById(id).then((r) => r.data as TeacherDetail),
  });

  const { data: gradesRes } = useQuery({
    queryKey: ["teacher-recent-grades", id],
    queryFn: () => gradesApi.getAll({ teacherId: id, limit: 5 }).then((r) => r.data as { data: GradeRow[] }),
  });
  const recentGrades = gradesRes?.data ?? [];

  const groups = teacher?.groups ?? [];
  const totalStudents = groups.reduce((sum, g) => sum + (Number(g.student_count) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">{teacher?.fullName}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{teacher?.subjects.join(", ")} • {teacher?.experience ?? 0} yil tajriba</p>
        </div>
        <Link href={`/admin/teachers/${id}/edit`}>
          <Button variant="outline" size="sm"><Edit className="h-4 w-4" />Tahrirlash</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-col items-center text-center">
                <UserAvatar name={teacher?.fullName || "?"} size="xl" />
                <h2 className="font-bold text-lg mt-3">{teacher?.fullName}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{teacher?.subjects.join(", ")}</p>
                <Badge variant={teacher?.isActive ? "success" : "secondary"} className="mt-2">
                  {teacher?.isActive ? "Faol" : "Nofaol"}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span>{teacher?.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="text-[var(--muted-foreground)]">Login ID:</span>
                  <span className="font-mono truncate">{teacher?.loginId || "—"}</span>
                </div>
                {teacher?.hireDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>Qabul qilingan: {formatDate(teacher.hireDate)}</span>
                  </div>
                )}
              </div>

              {teacher?.bio && (
                <p className="text-sm text-[var(--muted-foreground)] mt-4 border-t border-[var(--border)] pt-4">{teacher.bio}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Maosh</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Tur</span>
                <span className="font-medium">{teacher?.salaryType === "MONTHLY" ? "Oylik" : "Soatlik"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Miqdor</span>
                <span className="font-bold text-[#1E3A5F]">{formatCurrency(teacher?.salary ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-5">
              <p className="text-xs text-[var(--muted-foreground)]">Guruhlar</p>
              <p className="text-2xl font-bold mt-1">{groups.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <p className="text-xs text-[var(--muted-foreground)]">O'quvchilar</p>
              <p className="text-2xl font-bold mt-1">{totalStudents}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <p className="text-xs text-[var(--muted-foreground)]">Tajriba</p>
              <p className="text-2xl font-bold mt-1">{teacher?.experience ?? 0} yil</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Guruhlar</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {groups.map(g => (
                  <div key={g.id} className="flex items-center gap-4 px-5 py-4"
                    onClick={() => router.push(`/admin/groups/${g.id}`)}
                    style={{ cursor: "pointer" }}>
                    <div className="h-9 w-9 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-[#1E3A5F]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{g.name}</p>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{Number(g.student_count) || 0} o'quvchi</span>
                        <span>{g.subject_name || "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="text-center py-8 text-sm text-[var(--muted-foreground)]">Guruhlar yo'q</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>So'nggi baholar</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {recentGrades.map((g) => (
                  <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{g.studentName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{typeLabels[g.type] || g.type} • {formatDate(g.date)}</p>
                    </div>
                    <p className="font-bold text-[#1E3A5F]">{g.score}/{g.maxScore}</p>
                  </div>
                ))}
                {recentGrades.length === 0 && (
                  <p className="text-center py-8 text-sm text-[var(--muted-foreground)]">Baholar yo'q</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}