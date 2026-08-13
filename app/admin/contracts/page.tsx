"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { contractsApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

type ContractStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

interface ContractRow {
  id: string;
  studentId: string;
  contractNumber: string;
  fileUrl: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  status: ContractStatus;
  createdAt: string;
}
interface StudentOption { id: string; fullName: string; }

const statusConfig: Record<ContractStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "Faol", variant: "success" },
  EXPIRED: { label: "Muddati tugadi", variant: "secondary" },
  CANCELLED: { label: "Bekor qilindi", variant: "destructive" },
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { studentId: "", contractNumber: "", signedAt: new Date().toISOString().split("T")[0], expiresAt: "" };

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"ALL" | ContractStatus>("ALL");

  const { data } = useQuery({
    queryKey: ["contracts", { status: filter }],
    queryFn: () =>
      contractsApi.getAll({ status: filter === "ALL" ? undefined : filter, limit: 100 }).then((r) => r.data as { data: ContractRow[]; meta: { total: number } }),
  });
  const contracts = data?.data ?? [];

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];
  const studentMap = React.useMemo(() => new Map(students.map((s) => [s.id, s.fullName])), [students]);

  const filtered = contracts.filter((c) => {
    const studentName = studentMap.get(c.studentId) ?? "";
    return !search || studentName.toLowerCase().includes(search.toLowerCase()) || c.contractNumber.toLowerCase().includes(search.toLowerCase());
  });

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;

  const createMutation = useMutation({
    mutationFn: () =>
      contractsApi.create({
        studentId: form.studentId,
        contractNumber: form.contractNumber,
        signedAt: form.signedAt || undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Shartnoma qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => contractsApi.update(id, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Shartnoma bekor qilindi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.studentId || !form.contractNumber || !form.expiresAt) { toast.error("O'quvchi, raqam va muddatni kiriting"); return; }
    createMutation.mutate();
  };

  const handleCancel = async (id: string) => {
    if (!(await confirm("Shartnomani bekor qilishni tasdiqlaysizmi?"))) return;
    cancelMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Shartnomalar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{activeCount} ta faol shartnoma</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Shartnoma</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki raqam bo'yicha qidirish..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "EXPIRED", "CANCELLED"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
              {f === "ALL" ? "Barchasi" : statusConfig[f as ContractStatus].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <tr>
                {["Raqam", "O'quvchi", "Imzolangan", "Muddat", "Holat", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((c) => {
                const studentName = studentMap.get(c.studentId) ?? "—";
                return (
                  <tr key={c.id} className="hover:bg-[var(--muted)]/20">
                    <td className="px-4 py-3 font-mono text-xs text-[#1E3A5F] font-semibold">{c.contractNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={studentName} size="sm" />
                        <span className="font-medium whitespace-nowrap">{studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">{c.signedAt ? formatDate(c.signedAt) : "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusConfig[c.status].variant}>{statusConfig[c.status].label}</Badge></td>
                    <td className="px-4 py-3">
                      {c.status === "ACTIVE" && (
                        <button onClick={() => handleCancel(c.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">Bekor</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Ma'lumot yo'q</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Yangi shartnoma</DialogTitle></DialogHeader>
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
            <Input label="Shartnoma raqami *" value={form.contractNumber} onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))} placeholder="CTR-2026-001" />
            <Input label="Imzolangan sana" type="date" value={form.signedAt} onChange={(e) => setForm((f) => ({ ...f, signedAt: e.target.value }))} />
            <Input label="Muddat *" type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
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