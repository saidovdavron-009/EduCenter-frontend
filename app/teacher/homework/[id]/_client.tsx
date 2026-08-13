"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, CheckCircle, Clock, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { formatDate, formatDateTime } from "@/lib/utils";
import { homeworkApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  studentName: string;
  text: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}
interface HomeworkDetail {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxScore: number;
  submissions: Submission[];
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function GradeRow({ homeworkId, submission, maxScore }: { homeworkId: string; submission: Submission; maxScore: number }) {
  const queryClient = useQueryClient();
  const [score, setScore] = React.useState(submission.score != null ? String(submission.score) : "");
  const [feedback, setFeedback] = React.useState(submission.feedback ?? "");

  const gradeMutation = useMutation({
    mutationFn: () => homeworkApi.grade(homeworkId, submission.id, { score: Number(score), feedback: feedback || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework", homeworkId] });
      toast.success("Baholandi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-2 min-w-0 sm:w-48 shrink-0">
        <UserAvatar name={submission.studentName} size="sm" />
        <span className="text-sm font-medium truncate">{submission.studentName}</span>
      </div>
      <div className="flex-1 min-w-0 text-sm text-[var(--muted-foreground)]">
        {submission.text && <p className="line-clamp-2">{submission.text}</p>}
        {submission.fileUrl && (
          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#1E3A5F] hover:underline">
            <Paperclip className="h-3 w-3" />Fayl
          </a>
        )}
        <p className="text-xs mt-0.5">{formatDateTime(submission.submittedAt)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Input type="number" placeholder="Ball" value={score} onChange={(e) => setScore(e.target.value)} className="w-20 h-8 text-sm" />
        <span className="text-xs text-[var(--muted-foreground)]">/{maxScore}</span>
        <Input placeholder="Izoh" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-32 h-8 text-sm" />
        <Button size="sm" className="h-8 text-xs" loading={gradeMutation.isPending} onClick={() => gradeMutation.mutate()} disabled={!score}>
          {submission.gradedAt ? "Yangilash" : "Baholash"}
        </Button>
      </div>
    </div>
  );
}

export default function TeacherHomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: hw, isLoading } = useQuery({
    queryKey: ["homework", id],
    queryFn: () => homeworkApi.getById(id as string).then((r) => r.data as HomeworkDetail),
  });

  const { data: group } = useQuery({
    queryKey: ["group-detail", hw?.groupId],
    queryFn: () => groupsApi.getById(hw!.groupId).then((r) => r.data as { name: string; currentCount: number }),
    enabled: !!hw?.groupId,
  });

  if (isLoading) {
    return <div className="max-w-2xl space-y-4"><div className="h-40 bg-[var(--muted)] rounded-xl animate-pulse" /></div>;
  }

  if (!hw) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[var(--muted-foreground)]">Vazifa topilmadi</p>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Orqaga</Button>
      </div>
    );
  }

  const isOverdue = new Date(hw.dueDate) < new Date();
  const totalStudents = group?.currentCount ?? 0;
  const submittedCount = hw.submissions.length;
  const pct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold truncate">{hw.title}</h1>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <p className="font-semibold">{hw.title}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{group?.name ?? "—"}</p>
              </div>
            </div>
            <Badge variant={isOverdue ? "destructive" : "success"}>
              {isOverdue ? "Muddati o'tgan" : "Aktiv"}
            </Badge>
          </div>

          {hw.description && <p className="text-sm leading-relaxed">{hw.description}</p>}

          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Muddat: {formatDate(hw.dueDate)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-[#1E3A5F]">{totalStudents}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Jami o'quvchi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Topshirdi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{Math.max(totalStudents - submittedCount, 0)}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Topshirmadi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Topshirish holati</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Bajarilish foizi</span>
            <span className="font-bold text-[#1E3A5F]">{pct}%</span>
          </div>
          <div className="w-full h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" />{submittedCount} topshirdi</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" />{Math.max(totalStudents - submittedCount, 0)} kutilmoqda</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Topshiriqlar</CardTitle></CardHeader>
        <CardContent>
          {hw.submissions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Hali hech kim topshirmagan</p>
          ) : (
            hw.submissions.map((s) => <GradeRow key={s.id} homeworkId={hw.id} submission={s} maxScore={hw.maxScore} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}