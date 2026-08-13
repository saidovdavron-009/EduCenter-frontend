"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Film, Image as ImageIcon, Link as LinkIcon, ExternalLink, Trash2, Pencil } from "lucide-react";
import { materialsApi, groupsApi, teachersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import toast from "react-hot-toast";

type MaterialType = "PDF" | "VIDEO" | "IMAGE" | "LINK";

interface MaterialRow {
  id: string;
  groupId: string | null;
  teacherId: string;
  title: string;
  type: MaterialType;
  url: string;
  description: string | null;
  createdAt: string;
}
interface GroupOption { id: string; name: string; }
interface TeacherOption { id: string; fullName: string; }

const NO_GROUP = "__none__";

const typeConfig: Record<MaterialType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PDF: { label: "PDF", icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  VIDEO: { label: "Video", icon: Film, color: "text-blue-600", bg: "bg-blue-50" },
  IMAGE: { label: "Rasm", icon: ImageIcon, color: "text-green-600", bg: "bg-green-50" },
  LINK: { label: "Havola", icon: LinkIcon, color: "text-purple-600", bg: "bg-purple-50" },
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [groupFilter, setGroupFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: "", type: "PDF" as MaterialType, url: "", groupId: NO_GROUP, teacherId: "", description: "" });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", { groupId: groupFilter, type: typeFilter }],
    queryFn: () =>
      materialsApi
        .getAll({ groupId: groupFilter === "ALL" ? undefined : groupFilter, type: typeFilter === "ALL" ? undefined : typeFilter })
        .then((r) => r.data as MaterialRow[]),
  });

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];
  const groupMap = React.useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 100 }).then((r) => r.data as { data: TeacherOption[] }),
  });
  const teachers = teachersRes?.data ?? [];
  const teacherMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.fullName])), [teachers]);

  const createMutation = useMutation({
    mutationFn: () =>
      materialsApi.create({
        title: form.title,
        type: form.type,
        url: form.url,
        groupId: form.groupId === NO_GROUP ? undefined : form.groupId,
        teacherId: form.teacherId,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material qo'shildi");
      setShowModal(false);
      setForm({ title: "", type: "PDF", url: "", groupId: NO_GROUP, teacherId: "", description: "" });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      materialsApi.update(editId as string, {
        title: form.title,
        type: form.type,
        url: form.url,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material yangilandi");
      setShowModal(false);
      setEditId(null);
      setForm({ title: "", type: "PDF", url: "", groupId: NO_GROUP, teacherId: "", description: "" });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material o'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ title: "", type: "PDF", url: "", groupId: NO_GROUP, teacherId: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (m: MaterialRow) => {
    setEditId(m.id);
    setForm({
      title: m.title,
      type: m.type,
      url: m.url,
      groupId: m.groupId || NO_GROUP,
      teacherId: m.teacherId,
      description: m.description || "",
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    if (editId) {
      if (!form.title || !form.url) { toast.error("Barcha majburiy maydonlarni to'ldiring"); return; }
      updateMutation.mutate();
      return;
    }
    if (!form.title || !form.url || !form.teacherId) { toast.error("Barcha majburiy maydonlarni to'ldiring"); return; }
    createMutation.mutate();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'quv materiallari</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{materials.length} ta material</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />Material qo'shish
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Guruh" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barcha guruhlar</SelectItem>
            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Tur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            {(Object.keys(typeConfig) as MaterialType[]).map((t) => (
              <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><div className="h-20 bg-[var(--muted)] rounded animate-pulse" /></CardContent></Card>
          ))
        ) : materials.length === 0 ? (
          <div className="col-span-full text-center text-[var(--muted-foreground)] py-12">Materiallar topilmadi</div>
        ) : (
          materials.map((m) => {
            const cfg = typeConfig[m.type];
            const Icon = cfg.icon;
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{m.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                        {m.groupId ? groupMap.get(m.groupId) ?? "—" : "Umumiy"} · {teacherMap.get(m.teacherId) ?? "—"}
                      </p>
                      {m.description && <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">{m.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{cfg.label}</Badge>
                        <span className="text-xs text-[var(--muted-foreground)] ml-auto">{formatDate(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />Ochish
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editId ? "Materialni tahrirlash" : "Yangi material"}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <Input label="Sarlavha *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Material nomi" />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tur</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as MaterialType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeConfig) as MaterialType[]).map((t) => (
                    <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="URL *" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            {!editId && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">O'qituvchi *</label>
                  <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
                    <SelectTrigger><SelectValue placeholder="O'qituvchi tanlang" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Guruh</label>
                  <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_GROUP}>Umumiy (guruhsiz)</SelectItem>
                      {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Textarea label="Tavsif" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditId(null); }}>Bekor qilish</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}