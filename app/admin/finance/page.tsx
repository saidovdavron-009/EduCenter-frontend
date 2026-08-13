"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, CreditCard, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { paymentsApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";
type PaymentMethod = "CASH" | "CARD" | "CLICK" | "PAYME" | "UZUM";

interface PaymentRow {
  id: string;
  studentName: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
}

interface StudentOption { id: string; fullName: string; }

const methodLabel: Record<PaymentMethod, string> = { CASH: "Naqd", CARD: "Karta", CLICK: "Click", PAYME: "Payme", UZUM: "Uzum" };

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const now = new Date();
const emptyForm = { studentId: "", amount: "", method: "CASH" as PaymentMethod, description: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()) };
const MONTH_LABELS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [showModal, setShowModal] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["payments", { statusFilter }],
    queryFn: () =>
      paymentsApi.getAll({ status: statusFilter === "ALL" ? undefined : statusFilter, limit: 100 }).then(
        (r) => r.data as { data: PaymentRow[] }
      ),
    placeholderData: (prev) => prev,
  });
  const payments = data?.data ?? [];

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 100 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];

  const { data: dashboard } = useQuery({
    queryKey: ["payments-dashboard"],
    queryFn: () => paymentsApi.getDashboard().then((r) => r.data as { monthlyRevenue: number; pendingAmount: number; debtorsCount: number }),
  });

  const createMutation = useMutation({
    mutationFn: () => paymentsApi.create({
      studentId: form.studentId, amount: Number(form.amount), method: form.method,
      description: form.description || undefined, month: Number(form.month), year: Number(form.year),
    }),
    onSuccess: () => {
      toast.success("To'lov qabul qilindi");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments-dashboard"] });
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleAdd = () => {
    if (!form.studentId || !form.amount) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Moliya va To'lovlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">To'lovlarni boshqarish</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />To'lov qabul qilish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Shu oy to'landi" value={formatCurrency(dashboard?.monthlyRevenue ?? 0)} icon={<CheckCircle className="h-5 w-5" />} iconBg="bg-green-100" />
        <StatCard title="Kutilmoqda" value={formatCurrency(dashboard?.pendingAmount ?? 0)} icon={<Clock className="h-5 w-5" />} iconBg="bg-amber-100" />
        <StatCard title="Qarzdorlar" value={dashboard?.debtorsCount ?? 0} icon={<AlertCircle className="h-5 w-5" />} iconBg="bg-red-100" />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Barchasi</SelectItem>
          <SelectItem value="PAID">To'langan</SelectItem>
          <SelectItem value="PENDING">Kutilmoqda</SelectItem>
          <SelectItem value="OVERDUE">Muddati o'tgan</SelectItem>
        </SelectContent>
      </Select>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>O'quvchi</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>Usul</TableHead>
              <TableHead>Holat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-[var(--muted-foreground)]">To'lovlar topilmadi</TableCell>
              </TableRow>
            ) : (
              payments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{row.studentName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{row.paidAt ? formatDate(row.paidAt) : "—"}</p>
                  </TableCell>
                  <TableCell><span className="font-semibold text-sm">{formatCurrency(Number(row.amount))}</span></TableCell>
                  <TableCell><span className="text-sm">{methodLabel[row.method]}</span></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>To'lov qabul qilish</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">O'quvchi *</label>
              <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="O'quvchini tanlang" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input label="Miqdor (so'm) *" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="500000" />
            <div>
              <label className="text-sm font-medium mb-1.5 block">To'lov usuli</label>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Naqd</SelectItem>
                  <SelectItem value="CARD">Karta</SelectItem>
                  <SelectItem value="CLICK">Click</SelectItem>
                  <SelectItem value="PAYME">Payme</SelectItem>
                  <SelectItem value="UZUM">Uzum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Qaysi oy uchun</label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.month} onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
              </div>
            </div>
            <Input label="Izoh" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ixtiyoriy" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Bekor qilish</Button>
            <Button onClick={handleAdd} loading={createMutation.isPending}><CreditCard className="h-4 w-4" />Qabul qilish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}