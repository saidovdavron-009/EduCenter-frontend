"use client";
import React from "react";
import { Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { subjectsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  isActive: boolean;
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const empty = { name: "", level: "", description: "" };

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(empty);
  const [search, setSearch] = React.useState("");

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", search],
    queryFn: () => subjectsApi.getAll({ search: search || undefined }).then((r) => r.data as Subject[]),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["subjects"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof empty) => subjectsApi.create({ name: data.name, level: data.level || undefined, description: data.description || undefined }),
    onSuccess: () => { toast.success("Fan qo'shildi"); invalidate(); setOpen(false); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof empty }) =>
      subjectsApi.update(id, { name: data.name, level: data.level || undefined, description: data.description || undefined }),
    onSuccess: () => { toast.success("Yangilandi"); invalidate(); setOpen(false); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.delete(id),
    onSuccess: () => { toast.success("O'chirildi"); invalidate(); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Subject) => { setEditId(s.id); setForm({ name: s.name, level: s.level || "", description: s.description || "" }); setOpen(true); };

  const handleSave = () => {
    if (!form.name || form.name.length < 2) { toast.error("Fan nomi kamida 2 ta belgi bo'lishi kerak"); return; }
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = async (id: string) => {
    if (await confirm("Fanni o'chirishni tasdiqlaysizmi?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Fanlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{subjects.length} ta fan</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Fan qo'shish</Button>
      </div>

      <Input placeholder="Fan nomi bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Fanlar topilmadi</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-[#1E3A5F]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      {s.level && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.level}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {s.description && <p className="text-xs text-[var(--muted-foreground)]">{s.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Fanni tahrirlash" : "Yangi fan"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Fan nomi *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ingliz tili" />
          <Input label="Daraja" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="A1-C2" />
          <Input label="Tavsif" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Fan haqida qisqacha..." />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}