"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { gradesApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

type GradeType = "HOMEWORK" | "CLASSWORK" | "TEST" | "EXAM";

interface GroupOption { id: string; name: string; }
interface GroupStudent { id: string; fullName: string; }
interface GradeRow {
  id: string; studentName: string; type: GradeType; score: number; maxScore: number; date: string; comment: string | null;
}

const gradeTypeColors: Record<GradeType, "secondary" | "warning" | "destructive" | "success"> = {
  HOMEWORK: "secondary",
  CLASSWORK: "success",
  TEST: "warning",
  EXAM: "destructive",
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
};

const emptyForm = { studentId: "", type: "HOMEWORK" as GradeType, score: "", maxScore: "100", date: new Date().toISOString().split("T")[0], comment: "" };

export default function TeacherGradesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const teacherId = user?.profile?.id;
  const [group, setGroup] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data: groupsRes } = useQuery({
    queryKey: ["my-groups-options", teacherId],
    queryFn: () => groupsApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
    enabled: !!teacherId,
  });
  const groups = groupsRes?.data ?? [];

  React.useEffect(() => {
    if (!group && groups.length > 0) setGroup(groups[0].id);
  }, [groups, group]);

  const { data: groupStudents = [] } = useQuery({
    queryKey: ["group-students", group],
    queryFn: () => groupsApi.getById(group).then((r) => (r.data as { students: GroupStudent[] }).students),
    enabled: !!group,
  });

  const { data: gradesRes } = useQuery({
    queryKey: ["grades", { group, typeFilter }],
    queryFn: () => gradesApi.getAll({ groupId: group, type: typeFilter === "ALL" ? undefined : typeFilter, limit: 100 })
      .then((r) => r.data as { data: GradeRow[]; meta: { total: number } }),
    enabled: !!group,
  });
  const grades = gradesRes?.data ?? [];

  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length)
    : 0;

  const createMutation = useMutation({
    mutationFn: () => gradesApi.create({
      studentId: form.studentId,
      groupId: group,
      type: form.type,
      score: Number(form.score),
      maxScore: Number(form.maxScore),
      date: form.date,
      comment: form.comment || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Baho qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.studentId || !form.score) { toast.error("O'quvchi va ballni kiriting"); return; }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Baholar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">O'quvchilar baholarini boshqarish</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!group}><Plus className="h-4 w-4" />Baho qo'shish</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Guruh" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Tur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="HOMEWORK">Uyga vazifa</SelectItem>
            <SelectItem value="CLASSWORK">Sinf ishi</SelectItem>
            <SelectItem value="TEST">Test</SelectItem>
            <SelectItem value="EXAM">Imtihon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">O'rtacha ball</p>
            <p className={`text-2xl font-bold mt-1 ${getScoreColor(avgScore, 100)}`}>{avgScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">Jami yozuvlar</p>
            <p className="text-2xl font-bold mt-1">{grades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">O'quvchilar</p>
            <p className="text-2xl font-bold mt-1">{groupStudents.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Baholar ro'yxati</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {grades.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                <UserAvatar name={g.studentName} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{g.studentName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatDate(g.date)}{g.comment ? ` • ${g.comment}` : ""}</p>
                </div>
                <Badge variant={gradeTypeColors[g.type]}>{getStatusLabel(g.type)}</Badge>
                <p className={`text-base font-bold w-16 text-right ${getScoreColor(g.score, g.maxScore)}`}>
                  {g.score}/{g.maxScore}
                </p>
              </div>
            ))}
            {grades.length === 0 && (
              <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Baholar yo'q</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>Yangi baho</ModalTitle></ModalHeader>
        <div className="space-y-4 p-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">O'quvchi</label>
            <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
              <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
              <SelectContent>
                {groupStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Baho turi</label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as GradeType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOMEWORK">Uyga vazifa</SelectItem>
                <SelectItem value="CLASSWORK">Sinf ishi</SelectItem>
                <SelectItem value="TEST">Test</SelectItem>
                <SelectItem value="EXAM">Imtihon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ball" type="number" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} placeholder="85" />
            <Input label="Maksimal" type="number" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))} />
          </div>
          <Input label="Sana" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input label="Izoh (ixtiyoriy)" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder="..." />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}