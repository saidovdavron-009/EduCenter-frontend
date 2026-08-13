"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Clock, Plus, Trash2, CheckCircle2, Circle, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/utils";
import { quizzesApi, groupsApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface QuizOption { id: string; optionText: string; isCorrect: boolean; }
interface QuizQuestion { id: string; questionText: string; imageUrl: string | null; points: number; options: QuizOption[]; }
interface QuizDetail {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  timeLimitMins: number | null;
  isPublished: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  questions: QuizQuestion[];
}
interface QuizResultRow { id: string; studentId: string; score: number; maxScore: number; finishedAt: string; }
interface StudentOption { id: string; fullName: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyOption = () => ({ key: Math.random().toString(36).slice(2), optionText: "" });

function AddQuestionForm({ quizId }: { quizId: string }) {
  const queryClient = useQueryClient();
  const [questionText, setQuestionText] = React.useState("");
  const [points, setPoints] = React.useState("1");
  const [options, setOptions] = React.useState([emptyOption(), emptyOption()]);
  const [correctKey, setCorrectKey] = React.useState<string>("");

  const addMutation = useMutation({
    mutationFn: () =>
      quizzesApi.addQuestion(quizId, {
        questionText,
        points: Number(points) || 1,
        options: options
          .filter((o) => o.optionText.trim())
          .map((o) => ({ optionText: o.optionText, isCorrect: o.key === correctKey })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      toast.success("Savol qo'shildi");
      setQuestionText("");
      setPoints("1");
      setOptions([emptyOption(), emptyOption()]);
      setCorrectKey("");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSubmit = () => {
    const filled = options.filter((o) => o.optionText.trim());
    if (!questionText.trim()) { toast.error("Savol matnini kiriting"); return; }
    if (filled.length < 2) { toast.error("Kamida 2 ta variant kiriting"); return; }
    if (!correctKey || !filled.some((o) => o.key === correctKey)) { toast.error("To'g'ri javobni belgilang"); return; }
    addMutation.mutate();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Yangi savol qo&apos;shish</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea label="Savol matni *" rows={2} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Savolni kiriting" />
        <Input label="Ball" type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="w-24" />
        <div className="space-y-2">
          <label className="text-sm font-medium block">Variantlar * (to&apos;g&apos;risini belgilang)</label>
          {options.map((o, idx) => (
            <div key={o.key} className="flex items-center gap-2">
              <button type="button" onClick={() => setCorrectKey(o.key)} className="shrink-0">
                {correctKey === o.key ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />}
              </button>
              <Input
                value={o.optionText}
                onChange={(e) => setOptions((prev) => prev.map((p) => (p.key === o.key ? { ...p, optionText: e.target.value } : p)))}
                placeholder={`${idx + 1}-variant`}
                className="flex-1"
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions((prev) => prev.filter((p) => p.key !== o.key))} className="shrink-0 p-1 text-red-400 hover:bg-red-50 rounded">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setOptions((prev) => [...prev, emptyOption()])}>
            <Plus className="h-3 w-3" />Variant qo&apos;shish
          </Button>
        </div>
        <Button onClick={handleSubmit} loading={addMutation.isPending}>Savolni saqlash</Button>
      </CardContent>
    </Card>
  );
}

function QuestionCard({ quizId, question, index }: { quizId: string; question: QuizQuestion; index: number }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState(false);
  const [questionText, setQuestionText] = React.useState(question.questionText);
  const [points, setPoints] = React.useState(String(question.points));
  const [options, setOptions] = React.useState(
    question.options.map((o) => ({ key: o.id, optionText: o.optionText, isCorrect: o.isCorrect })),
  );
  const correctKey = options.find((o) => o.isCorrect)?.key ?? "";

  const startEdit = () => {
    setQuestionText(question.questionText);
    setPoints(String(question.points));
    setOptions(question.options.map((o) => ({ key: o.id, optionText: o.optionText, isCorrect: o.isCorrect })));
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      quizzesApi.updateQuestion(quizId, question.id, {
        questionText,
        points: Number(points) || 1,
        options: options.filter((o) => o.optionText.trim()).map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      toast.success("Savol yangilandi");
      setEditing(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => quizzesApi.deleteQuestion(quizId, question.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      toast.success("Savol o'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    const filled = options.filter((o) => o.optionText.trim());
    if (!questionText.trim()) { toast.error("Savol matnini kiriting"); return; }
    if (filled.length < 2) { toast.error("Kamida 2 ta variant kiriting"); return; }
    if (!filled.some((o) => o.isCorrect)) { toast.error("To'g'ri javobni belgilang"); return; }
    updateMutation.mutate();
  };

  const handleDelete = async () => {
    if (await confirm("Savolni o'chirishni tasdiqlaysizmi?")) deleteMutation.mutate();
  };

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea label="Savol matni *" rows={2} value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          <Input label="Ball" type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="w-24" />
          <div className="space-y-2">
            <label className="text-sm font-medium block">Variantlar * (to&apos;g&apos;risini belgilang)</label>
            {options.map((o, idx) => (
              <div key={o.key} className="flex items-center gap-2">
                <button type="button" onClick={() => setOptions((prev) => prev.map((p) => ({ ...p, isCorrect: p.key === o.key })))} className="shrink-0">
                  {o.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />}
                </button>
                <Input
                  value={o.optionText}
                  onChange={(e) => setOptions((prev) => prev.map((p) => (p.key === o.key ? { ...p, optionText: e.target.value } : p)))}
                  placeholder={`${idx + 1}-variant`}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions((prev) => prev.filter((p) => p.key !== o.key))} className="shrink-0 p-1 text-red-400 hover:bg-red-50 rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setOptions((prev) => [...prev, { key: Math.random().toString(36).slice(2), optionText: "", isCorrect: false }])}>
              <Plus className="h-3 w-3" />Variant qo&apos;shish
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" />Bekor</Button>
            <Button size="sm" onClick={handleSave} loading={updateMutation.isPending}>Saqlash</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{index + 1}. {question.questionText}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="secondary">{question.points} ball</Badge>
            <button onClick={startEdit} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={handleDelete} className="p-1 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="space-y-1">
          {question.options.map((o) => (
            <div key={o.id} className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg ${o.isCorrect ? "bg-green-50 text-green-700" : "text-[var(--muted-foreground)]"}`}>
              {o.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
              <span>{o.optionText}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminQuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = React.useState<"QUESTIONS" | "RESULTS">("QUESTIONS");

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => quizzesApi.getById(id).then((r) => r.data as QuizDetail),
  });

  const { data: group } = useQuery({
    queryKey: ["group-detail", quiz?.groupId],
    queryFn: () => groupsApi.getById(quiz!.groupId).then((r) => r.data as { name: string }),
    enabled: !!quiz?.groupId,
  });

  const { data: resultsRes } = useQuery({
    queryKey: ["quiz-results", id],
    queryFn: () => quizzesApi.getResults(id, { limit: 200 }).then((r) => r.data as { data: QuizResultRow[] }),
    enabled: tab === "RESULTS",
  });
  const results = resultsRes?.data ?? [];

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: StudentOption[] }),
    enabled: tab === "RESULTS",
  });
  const studentMap = React.useMemo(
    () => new Map((studentsRes?.data ?? []).map((s) => [s.id, s.fullName])),
    [studentsRes],
  );

  const publishMutation = useMutation({
    mutationFn: () => quizzesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", id] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test faollashtirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => quizzesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test o'chirildi");
      router.push("/admin/quizzes");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  if (isLoading) {
    return <div className="max-w-2xl space-y-4"><div className="h-40 bg-[var(--muted)] rounded-xl animate-pulse" /></div>;
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[var(--muted-foreground)]">Test topilmadi</p>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Orqaga</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">{quiz.title}</h1>
        {!quiz.isPublished && (
          <Button size="sm" variant="outline" loading={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
            Faollashtirish
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={async () => { if (await confirm("O'chirishni tasdiqlaysizmi?")) deleteMutation.mutate(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <p className="font-semibold">{quiz.title}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{group?.name ?? "—"}</p>
              </div>
            </div>
            <Badge variant={quiz.isPublished ? "success" : "secondary"}>{quiz.isPublished ? "Faol" : "Qoralama"}</Badge>
          </div>
          {quiz.description && <p className="text-sm leading-relaxed">{quiz.description}</p>}
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{quiz.timeLimitMins ? `${quiz.timeLimitMins} daqiqa` : "Vaqt chegarasi yo'q"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("QUESTIONS")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "QUESTIONS" ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
        >
          Savollar ({quiz.questions?.length ?? 0})
        </button>
        <button
          onClick={() => setTab("RESULTS")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "RESULTS" ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
        >
          Natijalar
        </button>
      </div>

      {tab === "QUESTIONS" ? (
        <div className="space-y-4">
          {(quiz.questions ?? []).map((q, idx) => (
            <QuestionCard key={q.id} quizId={quiz.id} question={q} index={idx} />
          ))}
          {(quiz.questions ?? []).length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">Hali savollar qo&apos;shilmagan</p>
          )}
          <AddQuestionForm quizId={quiz.id} />
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-sm">Natijalar</CardTitle></CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Hali hech kim topshirmagan</p>
            ) : (
              results.map((r) => {
                const pct = Number(r.maxScore) > 0 ? Math.round((Number(r.score) / Number(r.maxScore)) * 100) : 0;
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
                    <UserAvatar name={studentMap.get(r.studentId) ?? "?"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{studentMap.get(r.studentId) ?? "Noma'lum o'quvchi"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(r.finishedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1E3A5F]">{r.score}/{r.maxScore}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{pct}%</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}