"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { homeworkApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface HomeworkRow {
  id: string;
  title: string;
  description: string | null;
  groupName: string;
  dueDate: string;
  createdAt: string;
  submissionsCount: number;
}
interface GroupOption { id: string; name: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { title: "", groupId: "", dueDate: "", description: "", maxScore: "100" };

export default function TeacherHomeworkPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const teacherId = user?.profile?.id;
  const [filter, setFilter] = React.useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["my-homework", teacherId],
    queryFn: () => homeworkApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: HomeworkRow[]; meta: { total: number } }),
    enabled: !!teacherId,
  });
  const homeworks = data?.data ?? [];
  const filtered = homeworks.filter((h) => {
    const isExpired = new Date(h.dueDate) < new Date();
    if (filter === "ACTIVE") return !isExpired;
    if (filter === "EXPIRED") return isExpired;
    return true;
  });
  const activeCount = homeworks.filter((h) => new Date(h.dueDate) >= new Date()).length;

  const { data: groupsRes } = useQuery({
    queryKey: ["my-groups-options", teacherId],
    queryFn: () => groupsApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
    enabled: !!teacherId,
  });
  const groups = groupsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => homeworkApi.create({
      title: form.title,
      groupId: form.groupId,
      dueDate: form.dueDate,
      description: form.description || undefined,
      maxScore: Number(form.maxScore) || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-homework"] });
      toast.success("Uyga vazifa qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleCreate = () => {
    if (!form.title || !form.groupId || !form.dueDate) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Uyga vazifalar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{activeCount} ta faol vazifa</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Vazifa berish</Button>
      </div>

      <div className="flex gap-2">
        {(["ALL", "ACTIVE", "EXPIRED"] as const).map((f) => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {f === "ALL" ? "Barchasi" : f === "ACTIVE" ? "Faol" : "Muddati o'tgan"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((hw) => {
          const isExpired = new Date(hw.dueDate) < new Date();
          return (
            <Card key={hw.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/teacher/homework/${hw.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-[#1E3A5F]" />
                    </div>
                    <div>
                      <CardTitle className="text-sm leading-tight">{hw.title}</CardTitle>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{hw.groupName}</p>
                    </div>
                  </div>
                  <Badge variant={isExpired ? "secondary" : "success"}>
                    {isExpired ? "Tugagan" : "Faol"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hw.description && <p className="text-sm text-[var(--muted-foreground)]">{hw.description}</p>}
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Muddat: {formatDate(hw.dueDate)}</span>
                  <span>{hw.submissionsCount} ta topshirildi</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-[var(--muted-foreground)] py-12">Vazifalar yo'q</div>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="md">
        <ModalHeader><ModalTitle>Yangi uyga vazifa</ModalTitle></ModalHeader>
        <div className="space-y-4 p-6">
          <Input label="Sarlavha" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Vazifa nomi" />
          <div>
            <label className="text-sm font-medium mb-1.5 block">Guruh</label>
            <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
              <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Muddat (sana)" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Maksimal ball" type="number" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))} />
          </div>
          <Textarea label="Tavsif" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Vazifa haqida batafsil..." rows={3} />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleCreate} loading={createMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}