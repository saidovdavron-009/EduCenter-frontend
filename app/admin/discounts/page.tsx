"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { discountsApi, studentsApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

type DiscountType = "BROTHER_SISTER" | "FULL_PAYMENT" | "LOYALTY" | "PROMO";

interface DiscountRow {
  id: string;
  studentId: string;
  groupId: string | null;
  type: DiscountType;
  percentage: number;
  isActive: boolean;
  expiredAt: string | null;
  createdAt: string;
}
interface StudentOption { id: string; fullName: string; }
interface GroupOption { id: string; name: string; }

const typeLabels: Record<DiscountType, string> = {
  BROTHER_SISTER: "Aka-uka/Opa-singil",
  FULL_PAYMENT: "To'liq to'lov",
  LOYALTY: "Sadoqatli o'quvchi",
  PROMO: "Promo",
};
const typeColors: Record<DiscountType, string> = {
  BROTHER_SISTER: "bg-blue-100 text-blue-700",
  FULL_PAYMENT: "bg-green-100 text-green-700",
  LOYALTY: "bg-purple-100 text-purple-700",
  PROMO: "bg-amber-100 text-amber-700",
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const NO_GROUP = "__none__";
const emptyForm = { studentId: "", groupId: NO_GROUP, type: "BROTHER_SISTER" as DiscountType, percentage: "", expiredAt: "" };

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [filter, setFilter] = React.useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");

  const { data } = useQuery({
    queryKey: ["discounts", { filter }],
    queryFn: () =>
      discountsApi.getAll({ isActive: filter === "ALL" ? undefined : filter === "ACTIVE", limit: 100 }).then((r) => r.data as { data: DiscountRow[]; meta: { total: number } }),
  });
  const discounts = data?.data ?? [];
  const activeCount = discounts.filter((d) => d.isActive).length;

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];
  const studentMap = React.useMemo(() => new Map(students.map((s) => [s.id, s.fullName])), [students]);

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      discountsApi.create({
        studentId: form.studentId,
        groupId: form.groupId === NO_GROUP ? undefined : form.groupId,
        type: form.type,
        percentage: Number(form.percentage),
        expiredAt: form.expiredAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Chegirma qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.studentId || !form.percentage) { toast.error("O'quvchi va foizni kiriting"); return; }
    createMutation.mutate();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Chegirmalar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{activeCount} ta faol chegirma</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Chegirma berish</Button>
      </div>

      <div className="flex gap-2">
        {(["ALL", "ACTIVE", "EXPIRED"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {f === "ALL" ? "Barchasi" : f === "ACTIVE" ? "Faol" : "Nofaol"}
          </button>
        ))}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <tr>
                {["O'quvchi", "Tur", "Chegirma", "Muddat", "Holat", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {discounts.map((d) => {
                const studentName = studentMap.get(d.studentId) ?? "—";
                return (
                  <tr key={d.id} className="hover:bg-[var(--muted)]/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={studentName} size="sm" />
                        <span className="font-medium">{studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[d.type]}`}>{typeLabels[d.type]}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">{d.percentage}%</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{d.expiredAt ? formatDate(d.expiredAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.isActive ? "success" : "secondary"}>{d.isActive ? "Faol" : "Nofaol"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {discounts.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Ma'lumot yo'q</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Yangi chegirma</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">O'quvchi *</label>
              <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Guruh</label>
              <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>Barcha guruhlar uchun</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Chegirma turi</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DiscountType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeLabels) as DiscountType[]).map((t) => (
                    <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="Chegirma foizi (0-100) *" type="number" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} placeholder="10" />
            <Input label="Muddat" type="date" value={form.expiredAt} onChange={(e) => setForm((f) => ({ ...f, expiredAt: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSave} loading={createMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}