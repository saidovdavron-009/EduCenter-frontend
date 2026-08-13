"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, DoorOpen, Users, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roomsApi, branchesApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Room { id: string; branchId: string; name: string; capacity: number; isActive: boolean; }
interface BranchOption { id: string; name: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { name: "", branchId: "", capacity: "" };

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [filterBranch, setFilterBranch] = React.useState("ALL");

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-options"],
    queryFn: () => branchesApi.getAll({ limit: 100 }).then((r) => r.data as { data: BranchOption[] }),
  });
  const branches = branchesRes?.data ?? [];
  const branchMap = React.useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const { data: roomsRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll({ limit: 200 }).then((r) => r.data as { data: Room[]; meta: { total: number } }),
  });
  const rooms = roomsRes?.data ?? [];

  const filtered = filterBranch === "ALL" ? rooms : rooms.filter((r) => r.branchId === filterBranch);
  const activeCount = rooms.filter((r) => r.isActive).length;
  const inactiveCount = rooms.length - activeCount;

  const createMutation = useMutation({
    mutationFn: () => roomsApi.create({ name: form.name, branchId: form.branchId, capacity: Number(form.capacity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Xona qo'shildi");
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => roomsApi.update(editId as string, { name: form.name, capacity: Number(form.capacity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Yangilandi");
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm, branchId: branches[0]?.id ?? "" }); setOpen(true); };
  const openEdit = (r: Room) => { setEditId(r.id); setForm({ name: r.name, branchId: r.branchId, capacity: String(r.capacity) }); setOpen(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.capacity || !form.branchId) { toast.error("Filial, nom va sig'imni kiriting"); return; }
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
          <h1 className="text-xl sm:text-2xl font-bold">Xonalar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{rooms.length} ta xona</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Xona qo'shish</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-[#1E3A5F]">{rooms.length}</p><p className="text-xs text-[var(--muted-foreground)]">Jami xona</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{activeCount}</p><p className="text-xs text-[var(--muted-foreground)]">Faol</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-amber-500">{inactiveCount}</p><p className="text-xs text-[var(--muted-foreground)]">Nofaol</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterBranch("ALL")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterBranch === "ALL" ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
          Barchasi
        </button>
        {branches.map((b) => (
          <button key={b.id} onClick={() => setFilterBranch(b.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterBranch === b.id ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {b.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <Card key={r.id} className={r.isActive ? "border-green-200" : "border-amber-200"}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${r.isActive ? "bg-green-100" : "bg-amber-100"}`}>
                    <DoorOpen className={`h-5 w-5 ${r.isActive ? "text-green-600" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{branchMap.get(r.branchId) ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]"><Users className="h-3.5 w-3.5" />Sig'im: {r.capacity} kishi</span>
                <Badge variant={r.isActive ? "success" : "secondary"}>{r.isActive ? "Faol" : "Nofaol"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-[var(--muted-foreground)] py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">Xonalar yo'q</div>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Xonani tahrirlash" : "Yangi xona"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Xona nomi *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Xona 101" />
          <div>
            <label className="text-sm font-medium mb-1.5 block">Filial *</label>
            {editId ? (
              <p className="text-sm text-[var(--muted-foreground)] px-3 h-10 flex items-center bg-[var(--muted)]/50 rounded-lg">{branchMap.get(form.branchId) ?? "—"} (o'zgartirib bo'lmaydi)</p>
            ) : (
              <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
                <SelectTrigger><SelectValue placeholder="Filial tanlang" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <Input label="Sig'im (kishi) *" type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="20" />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}