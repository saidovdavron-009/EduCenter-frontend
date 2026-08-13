"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { homeworkApi, studentsApi } from "@/lib/api";

type HomeworkStatus = "PENDING" | "SUBMITTED" | "GRADED";

interface HomeworkRow {
  id: string; title: string; description: string | null; groupName: string; teacherName: string | null; dueDate: string; maxScore: number;
}
interface Submission { studentId: string; score: number | null; }

const statusConfig: Record<HomeworkStatus, { label: string; variant: "secondary" | "info" | "success" }> = {
  PENDING: { label: "Bajarilmagan", variant: "secondary" },
  SUBMITTED: { label: "Topshirildi", variant: "info" },
  GRADED: { label: "Baholandi", variant: "success" },
};

function isDueSoon(dueDate: string) {
  const diff = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff <= 2 && diff >= 0;
}

export default function StudentHomeworkPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [filter, setFilter] = React.useState<"ALL" | HomeworkStatus>("ALL");

  const { data: student } = useQuery({
    queryKey: ["my-student-profile", studentId],
    queryFn: () => studentsApi.getById(studentId as string).then((r) => r.data as { groups: { id: string; name: string }[] }),
    enabled: !!studentId,
  });
  const myGroupIds = (student?.groups ?? []).map((g) => g.id);

  const { data: homeworks = [] } = useQuery({
    queryKey: ["my-homework-list", myGroupIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(myGroupIds.map((gid) => homeworkApi.getAll({ groupId: gid, limit: 100 }).then((r) => (r.data as { data: HomeworkRow[] }).data)));
      return results.flat();
    },
    enabled: myGroupIds.length > 0,
  });

  const { data: mySubmissions = {} } = useQuery({
    queryKey: ["my-homework-submissions", homeworks.map((h) => h.id).join(","), studentId],
    queryFn: async () => {
      const details = await Promise.all(homeworks.map((h) => homeworkApi.getById(h.id).then((r) => (r.data as { submissions: Submission[] }).submissions)));
      const map: Record<string, Submission | undefined> = {};
      homeworks.forEach((h, i) => { map[h.id] = details[i].find((s) => s.studentId === studentId); });
      return map;
    },
    enabled: homeworks.length > 0 && !!studentId,
  });

  const getStatus = (hwId: string): HomeworkStatus => {
    const sub = mySubmissions[hwId];
    if (!sub) return "PENDING";
    return sub.score != null ? "GRADED" : "SUBMITTED";
  };

  const filtered = homeworks.filter((h) => filter === "ALL" || getStatus(h.id) === filter);
  const pendingCount = homeworks.filter((h) => getStatus(h.id) === "PENDING").length;
  const submittedCount = homeworks.filter((h) => getStatus(h.id) === "SUBMITTED").length;
  const gradedCount = homeworks.filter((h) => getStatus(h.id) === "GRADED").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Uyga vazifalar</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{pendingCount} ta bajarilmagan vazifa</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Bajarilmagan</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Topshirilgan</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{submittedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-[var(--muted-foreground)]">Baholangan</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{gradedCount}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "SUBMITTED", "GRADED"] as const).map((s) => (
          <button key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {s === "ALL" ? "Barchasi" : statusConfig[s].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((hw) => {
          const status = getStatus(hw.id);
          const cfg = statusConfig[status];
          const sub = mySubmissions[hw.id];
          const soon = isDueSoon(hw.dueDate) && status === "PENDING";
          return (
            <Card key={hw.id} className={`cursor-pointer hover:shadow-md transition-shadow ${soon ? "border-amber-300 bg-amber-50/50" : ""}`} onClick={() => router.push(`/student/homework/${hw.id}`)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${status === "GRADED" ? "bg-green-100" : status === "SUBMITTED" ? "bg-blue-100" : "bg-[#1E3A5F]/10"}`}>
                      {status === "GRADED" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-[#1E3A5F]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{hw.title}</p>
                        {soon && <Badge variant="warning">Tez orada!</Badge>}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{hw.groupName} • {hw.teacherName ?? "—"}</p>
                      {hw.description && <p className="text-sm text-[var(--muted-foreground)] mt-1.5">{hw.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Muddat: {formatDate(hw.dueDate)}
                        </span>
                        {sub?.score != null && (
                          <span className="font-medium text-green-600">{sub.score}/{hw.maxScore} ball</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[var(--muted-foreground)] py-12">Vazifalar yo'q</div>
        )}
      </div>
    </div>
  );
}