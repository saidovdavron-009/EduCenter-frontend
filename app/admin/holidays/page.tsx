"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarOff, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsApi, branchesApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Holiday { id: string; name: string; startDate: string; endDate: string; branchId: string | null; }
interface BranchOption { id: string; name: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const calcDays = (start: string, end: string) => {
  const d = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(1, d);
};

const ALL_BRANCHES = "__all__";
const emptyForm = { name: "", startDate: "", endDate: "", branchId: ALL_BRANCHES };

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => settingsApi.getHolidays().then((r) => r.data as { data: Holiday[] }),
  });
  const holidays = data?.data ?? [];

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-options"],
    queryFn: () => branchesApi.getAll({ limit: 100 }).then((r) => r.data as { data: BranchOption[] }),
  });
  const branches = branchesRes?.data ?? [];
  const branchMap = React.useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const upcoming = [...holidays].filter((h) => new Date(h.endDate) >= new Date()).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const past = [...holidays].filter((h) => new Date(h.endDate) < new Date()).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const createMutation = useMutation({
    mutationFn: () => settingsApi.createHoliday({
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate,
      branchId: form.branchId === ALL_BRANCHES ? undefined : form.branchId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Ta'til qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.updateHoliday(editId as string, {
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Ta'til yangilandi");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setOpen(true); };

  const openEdit = (h: Holiday) => {
    setEditId(h.id);
    setForm({ name: h.name, startDate: h.startDate.slice(0, 10), endDate: h.endDate.slice(0, 10), branchId: h.branchId || ALL_BRANCHES });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error("Tugash sanasi boshlanishdan oldin bo'lmasin"); return; }
    if (editId) { updateMutation.mutate(); return; }
    createMutation.mutate();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  const HolidayCard = ({ h }: { h: Holiday }) => {
    const isToday = new Date(h.startDate) <= new Date() && new Date(h.endDate) >= new Date();
    return (
      <div className={`bg-[var(--card)] border rounded-xl p-4 flex items-center gap-4 ${isToday ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-[var(--border)]"}`}>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isToday ? "bg-[#1E3A5F]" : "bg-[var(--muted)]"}`}>
          <CalendarOff className={`h-5 w-5 ${isToday ? "text-white" : "text-[var(--muted-foreground)]"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{h.name}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {h.startDate} — {h.endDate} • {calcDays(h.startDate, h.endDate)} kun • {h.branchId ? (branchMap.get(h.branchId) ?? "—") : "Barcha filiallar"}
          </p>
          {isToday && <p className="text-xs text-[#1E3A5F] font-medium mt-0.5">Hozir davom etmoqda</p>}
        </div>
        <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Ta'tillar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{upcoming.length} ta kelgusi ta'til</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Ta'til qo'shish</Button>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Kelgusi ta'tillar</h2>
          {upcoming.map((h) => <HolidayCard key={h.id} h={h} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">O'tgan ta'tillar</h2>
          {past.map((h) => <HolidayCard key={h.id} h={h} />)}
        </div>
      )}

      {holidays.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Ta'tillar yo'q</div>}

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Ta'tilni tahrirlash" : "Yangi ta'til"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Ta'til nomi *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Yangi yil ta'tili" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Boshlanish *" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="Tugash *" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          {!editId && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Filial</label>
              <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BRANCHES}>Barcha filiallar</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
            <p className="text-sm text-[var(--muted-foreground)]">Davomiyligi: {calcDays(form.startDate, form.endDate)} kun</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); }}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
