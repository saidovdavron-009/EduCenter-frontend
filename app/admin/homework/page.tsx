"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Eye, Trash2, Pencil } from "lucide-react";
import { homeworkApi, groupsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import toast from "react-hot-toast";

interface HomeworkRow {
  id: string;
  title: string;
  description: string | null;
  groupName: string;
  teacherName: string | null;
  dueDate: string;
  maxScore: number;
  createdAt: string;
  submissionsCount: number;
}
interface GroupOption { id: string; name: string; }
interface GroupDetail { teacherId: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function HomeworkPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: "", description: "", groupId: "", dueDate: "", maxScore: "100" });

  const { data, isLoading } = useQuery({
    queryKey: ["homework"],
    queryFn: () => homeworkApi.getAll({ limit: 100 }).then((r) => r.data as { data: HomeworkRow[]; meta: { total: number } }),
  });
  const homework = data?.data ?? [];

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const { data: selectedGroup } = useQuery({
    queryKey: ["group-detail", form.groupId],
    queryFn: () => groupsApi.getById(form.groupId).then((r) => r.data as GroupDetail),
    enabled: !!form.groupId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      homeworkApi.create({
        title: form.title,
        description: form.description || undefined,
        groupId: form.groupId,
        teacherId: selectedGroup?.teacherId,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore) || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Vazifa yaratildi");
      setShowModal(false);
      setForm({ title: "", description: "", groupId: "", dueDate: "", maxScore: "100" });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      homeworkApi.update(editId as string, {
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore) || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Vazifa yangilandi");
      setShowModal(false);
      setEditId(null);
      setForm({ title: "", description: "", groupId: "", dueDate: "", maxScore: "100" });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => homeworkApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Vazifa o'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ title: "", description: "", groupId: "", dueDate: "", maxScore: "100" });
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, hw: HomeworkRow) => {
    e.stopPropagation();
    setEditId(hw.id);
    setForm({
      title: hw.title,
      description: hw.description || "",
      groupId: "",
      dueDate: hw.dueDate.slice(0, 10),
      maxScore: String(hw.maxScore),
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    if (editId) {
      if (!form.title || !form.dueDate) { toast.error("Barcha maydonlarni to'ldiring"); return; }
      updateMutation.mutate();
      return;
    }
    if (!form.title || !form.groupId || !form.dueDate) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    createMutation.mutate();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Uy vazifalari va Kontent</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Vazifalar va materiallar boshqaruvi</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />Yangi vazifa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><div className="h-24 bg-[var(--muted)] rounded animate-pulse" /></CardContent></Card>
          ))
        ) : homework.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] col-span-full text-center py-12">Vazifalar topilmadi</p>
        ) : (
          homework.map((hw) => {
            const isOverdue = new Date(hw.dueDate) < new Date();
            return (
              <Card key={hw.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/admin/homework/${hw.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#1E3A5F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{hw.title}</CardTitle>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{hw.groupName}</p>
                      </div>
                    </div>
                    <Badge variant={isOverdue ? "destructive" : "success"} className="shrink-0">
                      {isOverdue ? "Muddati o'tgan" : "Aktiv"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {hw.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mb-3 line-clamp-2">{hw.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>Muddat: {formatDate(hw.dueDate)}</span>
                    <span>{formatRelativeTime(hw.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[var(--muted-foreground)]">{hw.submissionsCount} ta topshirildi</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/admin/homework/${hw.id}`); }}>
                        <Eye className="h-3 w-3" />Ko'rish
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => openEdit(e, hw)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(e, hw.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editId ? "Vazifani tahrirlash" : "Yangi uy vazifasi"}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <Input label="Sarlavha *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            {!editId && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Guruh *</label>
                <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Guruh tanlang" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Muddat *" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              <Input label="Maksimal ball" type="number" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))} />
            </div>
            <Textarea label="Tavsif" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditId(null); }}>Bekor qilish</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending || updateMutation.isPending}>{editId ? "Saqlash" : "Yaratish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}