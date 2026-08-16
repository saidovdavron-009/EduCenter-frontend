"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { branchesApi, teachersApi } from "@/lib/api";
import { formatPhone, formatPhoneInput } from "@/lib/utils";
import toast from "react-hot-toast";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  managerId: string | null;
  isActive: boolean;
}
interface TeacherOption { id: string; fullName: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const NO_MANAGER = "__none__";
const empty = { name: "", address: "", phone: "", managerId: NO_MANAGER, isActive: true };

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(empty);

  const { data } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getAll({ limit: 100 }).then((r) => r.data as { data: Branch[]; meta: { total: number } }),
  });
  const branches = data?.data ?? [];

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 200 }).then((r) => r.data as { data: TeacherOption[] }),
  });
  const teachers = teachersRes?.data ?? [];
  const teacherMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.fullName])), [teachers]);

  const createMutation = useMutation({
    mutationFn: () => branchesApi.create({
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      managerId: form.managerId === NO_MANAGER ? undefined : form.managerId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Filial qo'shildi");
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => branchesApi.update(editId as string, {
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      managerId: form.managerId === NO_MANAGER ? undefined : form.managerId,
      isActive: form.isActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Yangilandi");
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (b: Branch) => { setEditId(b.id); setForm({ name: b.name, address: b.address ?? "", phone: b.phone ?? "", managerId: b.managerId ?? NO_MANAGER, isActive: b.isActive }); setOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Filial nomini kiriting"); return; }
    if (editId) updateMutation.mutate(); else createMutation.mutate();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Filiallar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{branches.length} ta filial</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Filial qo'shish</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(b => (
          <Card key={b.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{b.isActive ? "Faol" : "Nofaol"}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
                {b.address && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{b.address}</div>}
                {b.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{formatPhone(b.phone)}</div>}
                {b.managerId && <p>Menejer: {teacherMap.get(b.managerId) ?? "—"}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {branches.length === 0 && (
          <div className="col-span-full text-center text-[var(--muted-foreground)] py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">Filiallar yo'q</div>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Filialni tahrirlash" : "Yangi filial"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Filial nomi *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Markaz filiali" />
          <Input label="Manzil" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Toshkent sh., ..." />
          <Input label="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhoneInput(e.target.value) }))} placeholder="+998 71 ..." />
          <div>
            <label className="text-sm font-medium mb-1.5 block">Menejer</label>
            <Select value={form.managerId} onValueChange={(v) => setForm(f => ({ ...f, managerId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER}>Tanlanmagan</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {editId && (
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm font-medium">Faol</label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
