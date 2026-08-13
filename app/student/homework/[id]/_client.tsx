"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, CheckCircle, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { homeworkApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Submission {
  id: string; studentId: string; text: string | null; fileUrl: string | null;
  score: number | null; feedback: string | null; submittedAt: string; gradedAt: string | null;
}
interface HomeworkDetail {
  id: string; groupId: string; title: string; description: string | null; dueDate: string; maxScore: number; submissions: Submission[];
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function StudentHomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [answer, setAnswer] = React.useState("");

  const { data: hw, isLoading } = useQuery({
    queryKey: ["homework", id],
    queryFn: () => homeworkApi.getById(id as string).then((r) => r.data as HomeworkDetail),
  });

  const mySubmission = hw?.submissions.find((s) => s.studentId === studentId);

  React.useEffect(() => {
    if (mySubmission?.text) setAnswer(mySubmission.text);
  }, [mySubmission?.text]);

  const submitMutation = useMutation({
    mutationFn: () => homeworkApi.submit(id as string, { text: answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework", id] });
      toast.success("Vazifa topshirildi!");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
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

  const isGraded = mySubmission?.score != null;
  const isSubmitted = !!mySubmission;
  const isOverdue = new Date(hw.dueDate) < new Date();
  const status = isGraded ? "Baholandi" : isSubmitted ? "Topshirildi" : "Bajarilmagan";
  const statusVariant = isGraded ? "success" : isSubmitted ? "info" : "secondary";

  const handleSubmit = () => {
    if (!answer.trim()) { toast.error("Javobingizni yozing"); return; }
    submitMutation.mutate();
  };

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
              </div>
            </div>
            <Badge variant={statusVariant}>{status}</Badge>
          </div>

          {hw.description && <p className="text-sm text-[var(--foreground)] leading-relaxed">{hw.description}</p>}

          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Muddat: {formatDate(hw.dueDate)}
            </span>
            {isOverdue && !isSubmitted && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />Muddati o'tgan
              </span>
            )}
          </div>

          {isGraded && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">Ball: {mySubmission!.score}/{hw.maxScore}</p>
                {mySubmission!.feedback && <p className="text-xs text-green-600 mt-0.5">{mySubmission!.feedback}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isSubmitted ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Topshirilgan javob</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)] italic">{mySubmission!.text || "Javob topshirildi"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-sm">Javobingizni yozing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Vazifani bajardim, bu yerga javobingizni yozing..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} loading={submitMutation.isPending}>
                <Send className="h-4 w-4" />Topshirish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}