"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { teacherSalariesApi, teachersApi } from "@/lib/api";
import toast from "react-hot-toast";

interface SalaryRow {
  id: string;
  teacherId: string;
  baseAmount: number;
  bonus: number;
  fine: number;
  totalPaid: number;
  periodStart: string;
  periodEnd: string;
  isPaid: boolean;
  paidAt: string | null;
  note: string | null;
}
interface TeacherOption { id: string; fullName: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function totalOf(s: SalaryRow) {
  return Number(s.baseAmount) + Number(s.bonus) - Number(s.fine);
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { start, end };
}

const emptyForm = { teacherId: "", baseAmount: "", bonus: "", fine: "", note: "" };

export default function SalariesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [payId, setPayId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [period, setPeriod] = React.useState(currentMonthRange());

  const { data } = useQuery({
    queryKey: ["teacher-salaries", period],
    queryFn: () => teacherSalariesApi.getAll({ limit: 200 }).then((r) => r.data as { data: SalaryRow[]; meta: { total: number } }),
  });
  const all = data?.data ?? [];
  const filtered = all.filter((s) => s.periodStart === period.start);

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 200 }).then((r) => r.data as { data: TeacherOption[] }),
  });
  const teachers = teachersRes?.data ?? [];
  const teacherMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.fullName])), [teachers]);

  const unpaidTotal = filtered.filter((s) => !s.isPaid).reduce((a, s) => a + totalOf(s), 0);
  const paidTotal = filtered.filter((s) => s.isPaid).reduce((a, s) => a + totalOf(s), 0);

  const createMutation = useMutation({
    mutationFn: () => teacherSalariesApi.create({
      teacherId: form.teacherId,
      baseAmount: Number(form.baseAmount),
      bonus: form.bonus ? Number(form.bonus) : undefined,
      fine: form.fine ? Number(form.fine) : undefined,
      periodStart: period.start,
      periodEnd: period.end,
      note: form.note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-salaries"] });
      toast.success("Maosh yozuvi qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => teacherSalariesApi.pay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-salaries"] });
      toast.success("Maosh to'landi");
      setPayId(null);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.teacherId || !form.baseAmount) { toast.error("O'qituvchi va asosiy maoshni kiriting"); return; }
    createMutation.mutate();
  };

  const detail = filtered.find((s) => s.id === payId);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'qituvchi maoshlari</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{filtered.filter((s) => !s.isPaid).length} ta to'lanmagan</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={period.start.slice(0, 7)} onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setPeriod({ start: new Date(y, m - 1, 1).toISOString().split("T")[0], end: new Date(y, m, 0).toISOString().split("T")[0] });
          }} className="max-w-[160px]" />
          <Button onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4" />Yozuv qo'shish</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-[var(--muted-foreground)]">Jami to'lanadigan</p><p className="text-lg font-bold text-amber-500 mt-1">{formatCurrency(unpaidTotal)}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-[var(--muted-foreground)]">To'langan</p><p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(paidTotal)}</p></CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardContent className="pt-4 pb-4"><p className="text-xs text-[var(--muted-foreground)]">Jami yozuv</p><p className="text-lg font-bold text-[#1E3A5F] mt-1">{filtered.length} ta</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => {
          const name = teacherMap.get(s.teacherId) ?? "Noma'lum";
          return (
            <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
              <UserAvatar name={name} size="md" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-[var(--muted-foreground)]">
                  <span>Asosiy: {formatCurrency(s.baseAmount)}</span>
                  {Number(s.bonus) > 0 && <span className="text-green-600">+Bonus: {formatCurrency(s.bonus)}</span>}
                  {Number(s.fine) > 0 && <span className="text-red-500">-Jarima: {formatCurrency(s.fine)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatCurrency(totalOf(s))}</p>
                {s.isPaid ? (
                  <Badge variant="success" className="mt-1">To'langan</Badge>
                ) : (
                  <Button size="sm" className="mt-1 h-7 text-xs" onClick={() => setPayId(s.id)}>To'lash</Button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Ma'lumot yo'q</div>}
      </div>

      {detail && (
        <Modal open={!!payId} onOpenChange={() => setPayId(null)} size="sm">
          <ModalHeader><ModalTitle>Maosh to'lash</ModalTitle></ModalHeader>
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar name={teacherMap.get(detail.teacherId) ?? "?"} size="md" />
              <div>
                <p className="font-semibold">{teacherMap.get(detail.teacherId) ?? "Noma'lum"}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{detail.periodStart} — {detail.periodEnd}</p>
              </div>
            </div>
            {[["Asosiy maosh", formatCurrency(detail.baseAmount)], ["Bonus", formatCurrency(detail.bonus)], ["Jarima", `-${formatCurrency(detail.fine)}`], ["Jami", formatCurrency(totalOf(detail))]].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0 last:font-bold">
                <span className="text-[var(--muted-foreground)]">{label}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPayId(null)}>Bekor</Button>
            <Button onClick={() => payMutation.mutate(detail.id)} loading={payMutation.isPending}>To'lash</Button>
          </ModalFooter>
        </Modal>
      )}

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>Yangi maosh yozuvi — {period.start.slice(0, 7)}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">O'qituvchi *</label>
            <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
              <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input label="Asosiy maosh (so'm) *" type="number" value={form.baseAmount} onChange={(e) => setForm((f) => ({ ...f, baseAmount: e.target.value }))} placeholder="3000000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bonus" type="number" value={form.bonus} onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))} placeholder="0" />
            <Input label="Jarima" type="number" value={form.fine} onChange={(e) => setForm((f) => ({ ...f, fine: e.target.value }))} placeholder="0" />
          </div>
          <Input label="Izoh" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ixtiyoriy" />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}