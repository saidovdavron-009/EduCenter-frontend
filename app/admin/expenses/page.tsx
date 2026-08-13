"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { expensesApi } from "@/lib/api";
import toast from "react-hot-toast";

type ExpenseCategory = "RENT" | "SALARY" | "UTILITY" | "OTHER";

interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount: string;
  description: string | null;
  date: string;
}

const categoryLabel: Record<ExpenseCategory, string> = { RENT: "Ijara", SALARY: "Ish haqi", UTILITY: "Kommunal", OTHER: "Boshqa" };
const categoryColor: Record<ExpenseCategory, string> = {
  RENT: "bg-blue-100 text-blue-800",
  SALARY: "bg-purple-100 text-purple-800",
  UTILITY: "bg-amber-100 text-amber-800",
  OTHER: "bg-gray-100 text-gray-800",
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { category: "OTHER" as ExpenseCategory, amount: "", description: "", date: new Date().toISOString().split("T")[0] };

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [showModal, setShowModal] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.getAll({ limit: 100 }).then((r) => r.data as { data: ExpenseRow[] }),
  });
  const expenses = data?.data ?? [];

  const sumByCategory = (cat: ExpenseCategory) => expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const createMutation = useMutation({
    mutationFn: () => expensesApi.create({ category: form.category, amount: Number(form.amount), description: form.description || undefined, date: form.date }),
    onSuccess: () => {
      toast.success("Xarajat qo'shildi");
      invalidate();
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => { toast.success("O'chirildi"); invalidate(); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleAdd = () => {
    if (!form.amount || !form.date) { toast.error("Miqdor va sanani kiriting"); return; }
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
          <h1 className="text-xl sm:text-2xl font-bold">Xarajatlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Xarajatlarni boshqarish</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />Xarajat qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard title="Ijara" value={formatCurrency(sumByCategory("RENT"))} icon={<DollarSign className="h-5 w-5" />} iconBg="bg-blue-100" />
        <StatCard title="Ish haqi" value={formatCurrency(sumByCategory("SALARY"))} icon={<DollarSign className="h-5 w-5" />} iconBg="bg-purple-100" />
        <StatCard title="Kommunal" value={formatCurrency(sumByCategory("UTILITY"))} icon={<DollarSign className="h-5 w-5" />} iconBg="bg-amber-100" />
        <StatCard title="Jami xarajat" value={formatCurrency(totalExpenses)} icon={<DollarSign className="h-5 w-5" />} iconBg="bg-red-100" />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kategoriya</TableHead>
              <TableHead>Tavsif</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[var(--muted-foreground)]">Xarajatlar topilmadi</TableCell>
              </TableRow>
            ) : (
              expenses.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor[row.category]}`}>
                      {categoryLabel[row.category]}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-sm">{row.description || "—"}</span></TableCell>
                  <TableCell><span className="font-semibold text-sm text-red-600">−{formatCurrency(Number(row.amount))}</span></TableCell>
                  <TableCell><span className="text-sm text-[var(--muted-foreground)]">{formatDate(row.date)}</span></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Xarajat qo'shish</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategoriya</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENT">Ijara</SelectItem>
                  <SelectItem value="SALARY">Ish haqi</SelectItem>
                  <SelectItem value="UTILITY">Kommunal</SelectItem>
                  <SelectItem value="OTHER">Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input label="Miqdor (so'm) *" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="5000000" />
            <Input label="Tavsif" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Xarajat nomi" />
            <Input label="Sana *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Bekor qilish</Button>
            <Button onClick={handleAdd} loading={createMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}