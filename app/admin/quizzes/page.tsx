"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardList, Trash2, Pencil } from "lucide-react";
import { quizzesApi, groupsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import toast from "react-hot-toast";

interface QuizRow {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  timeLimitMins: number | null;
  isPublished: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}
interface QuizDetail extends QuizRow { questions?: unknown[]; }
interface QuizResultRow { id: string; studentId: string; score: number; maxScore: number; }
interface GroupOption { id: string; name: string; }

type Status = "ACTIVE" | "DRAFT" | "FINISHED";

const statusConfig: Record<Status, { label: string; variant: "success" | "secondary" | "info" }> = {
  ACTIVE: { label: "Faol", variant: "success" },
  DRAFT: { label: "Qoralama", variant: "secondary" },
  FINISHED: { label: "Tugagan", variant: "info" },
};

function getStatus(q: QuizRow): Status {
  if (!q.isPublished) return "DRAFT";
  if (q.endAt && new Date(q.endAt) < new Date()) return "FINISHED";
  return "ACTIVE";
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { title: "", description: "", groupId: "", timeLimitMins: "30" };

export default function QuizzesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [filter, setFilter] = React.useState<"ALL" | Status>("ALL");

  const { data: quizzesRes, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => quizzesApi.getAll({ limit: 100 }).then((r) => r.data as { data: QuizRow[]; meta: { total: number } }),
  });
  const quizzes = quizzesRes?.data ?? [];

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];
  const groupMap = React.useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const quizIds = quizzes.map((q) => q.id).join(",");
  const { data: statsMap } = useQuery({
    queryKey: ["quizzes-stats", quizIds],
    queryFn: async () => {
      const entries = await Promise.all(
        quizzes.map(async (q) => {
          const [detail, results] = await Promise.all([
            quizzesApi.getById(q.id).then((r) => r.data as QuizDetail),
            quizzesApi.getResults(q.id, { limit: 200 }).then((r) => r.data as { data: QuizResultRow[] }),
          ]);
          const participantsCount = results.data.length;
          const avgScore =
            participantsCount > 0
              ? Math.round(
                  results.data.reduce((sum, r) => sum + (Number(r.maxScore) > 0 ? (Number(r.score) / Number(r.maxScore)) * 100 : 0), 0) /
                    participantsCount,
                )
              : 0;
          return [q.id, { questionsCount: detail.questions?.length ?? 0, avgScore, participantsCount }] as const;
        }),
      );
      return new Map(entries);
    },
    enabled: quizzes.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      quizzesApi.create({
        title: form.title,
        groupId: form.groupId,
        description: form.description || undefined,
        timeLimitMins: form.timeLimitMins ? Number(form.timeLimitMins) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test yaratildi");
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      quizzesApi.update(editId as string, {
        title: form.title,
        description: form.description || undefined,
        timeLimitMins: form.timeLimitMins ? Number(form.timeLimitMins) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test yangilandi");
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => quizzesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test faollashtirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizzesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Test o'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (e: React.MouseEvent, q: QuizRow) => {
    e.stopPropagation();
    setEditId(q.id);
    setForm({
      title: q.title,
      description: q.description || "",
      groupId: q.groupId,
      timeLimitMins: q.timeLimitMins ? String(q.timeLimitMins) : "",
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    if (editId) {
      if (!form.title) { toast.error("Test nomini kiriting"); return; }
      updateMutation.mutate();
      return;
    }
    if (!form.title || !form.groupId) { toast.error("Test nomi va guruhni tanlang"); return; }
    createMutation.mutate();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  const filtered = quizzes.filter((q) => filter === "ALL" || getStatus(q) === filter);
  const activeCount = quizzes.filter((q) => getStatus(q) === "ACTIVE").length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Testlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{activeCount} ta faol test</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Test yaratish</Button>
      </div>

      <div className="flex gap-2">
        {(["ALL", "ACTIVE", "DRAFT", "FINISHED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
            }`}
          >
            {f === "ALL" ? "Barchasi" : statusConfig[f].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><div className="h-24 bg-[var(--muted)] rounded animate-pulse" /></CardContent></Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center text-[var(--muted-foreground)] py-12">Testlar yo&apos;q</div>
        ) : (
          filtered.map((q) => {
            const status = getStatus(q);
            const stats = statsMap?.get(q.id);
            return (
              <Card key={q.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/admin/quizzes/${q.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-[#1E3A5F]" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{q.title}</CardTitle>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{groupMap.get(q.groupId) ?? "—"}</p>
                      </div>
                    </div>
                    <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--muted)]/50 rounded-lg p-2">
                      <p className="text-sm font-bold text-[#1E3A5F]">{stats?.questionsCount ?? "—"}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">Savol</p>
                    </div>
                    <div className="bg-[var(--muted)]/50 rounded-lg p-2">
                      <p className="text-sm font-bold text-[#1E3A5F]">{q.timeLimitMins ? `${q.timeLimitMins} min` : "—"}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">Vaqt</p>
                    </div>
                    <div className="bg-[var(--muted)]/50 rounded-lg p-2">
                      <p className="text-sm font-bold text-[#1E3A5F]">{stats && stats.participantsCount > 0 ? `${stats.avgScore}%` : "—"}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">O&apos;rtacha</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); publishMutation.mutate(q.id); }}
                        loading={publishMutation.isPending}
                      >
                        Faollashtirish
                      </Button>
                    )}
                    <button onClick={(e) => openEdit(e, q)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] ml-auto">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => handleDelete(e, q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editId ? "Testni tahrirlash" : "Yangi test"}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-3">
            <Input label="Test nomi *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Test nomi" />
            {!editId && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Guruh *</label>
                <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Guruh tanlang" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Input
              label="Vaqt chegarasi (daqiqa)"
              type="number"
              value={form.timeLimitMins}
              onChange={(e) => setForm((f) => ({ ...f, timeLimitMins: e.target.value }))}
              placeholder="30"
            />
            <Textarea label="Tavsif" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditId(null); }}>Bekor</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending || updateMutation.isPending}>{editId ? "Saqlash" : "Yaratish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}