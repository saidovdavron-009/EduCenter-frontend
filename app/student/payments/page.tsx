"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { paymentsApi } from "@/lib/api";

type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";

interface PaymentRow {
  id: string;
  groupName: string | null;
  amount: number;
  paidAt: string | null;
  dueDate: string | null;
  status: PaymentStatus;
  method: string | null;
  month: number;
  year: number;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: React.ReactNode; variant: "success" | "warning" | "destructive" }> = {
  PAID: { label: "To'langan", icon: <CheckCircle className="h-4 w-4 text-green-600" />, variant: "success" },
  PENDING: { label: "Kutilmoqda", icon: <Clock className="h-4 w-4 text-amber-500" />, variant: "warning" },
  OVERDUE: { label: "Muddati o'tdi", icon: <AlertTriangle className="h-4 w-4 text-red-500" />, variant: "destructive" },
};

const MONTH_NAMES = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

export default function StudentPaymentsPage() {
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | PaymentStatus>("ALL");

  const { data } = useQuery({
    queryKey: ["my-payments-full", studentId, statusFilter],
    queryFn: () => paymentsApi.getAll({ studentId, status: statusFilter === "ALL" ? undefined : statusFilter, limit: 100 })
      .then((r) => r.data as { data: PaymentRow[]; meta: { total: number } }),
    enabled: !!studentId,
  });
  const payments = data?.data ?? [];

  const { data: allData } = useQuery({
    queryKey: ["my-payments-all", studentId],
    queryFn: () => paymentsApi.getAll({ studentId, limit: 200 }).then((r) => r.data as { data: PaymentRow[] }),
    enabled: !!studentId,
  });
  const allPayments = allData?.data ?? [];

  const totalPaid = allPayments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = allPayments.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = allPayments.filter((p) => p.status === "OVERDUE").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">To'lovlarim</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">To'lov tarixi va holati</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-xs text-[var(--muted-foreground)]">To'langan</p>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{allPayments.filter((p) => p.status === "PAID").length} ta to'lov</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-[var(--muted-foreground)]">Kutilmoqda</p>
            </div>
            <p className="text-xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{allPayments.filter((p) => p.status === "PENDING").length} ta to'lov</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-[var(--muted-foreground)]">Muddati o'tgan</p>
            </div>
            <p className="text-xl font-bold text-red-500">{formatCurrency(totalOverdue)}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{allPayments.filter((p) => p.status === "OVERDUE").length} ta to'lov</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PAID", "PENDING", "OVERDUE"] as const).map((s) => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {s === "ALL" ? "Barchasi" : statusConfig[s].label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {payments.map((p) => {
              const cfg = statusConfig[p.status];
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-[#1E3A5F]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.groupName ?? "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {MONTH_NAMES[p.month - 1] ?? p.month} {p.year}
                      {p.method && ` • ${p.method}`}
                      {p.paidAt ? ` • To'langan: ${formatDate(p.paidAt)}` : p.dueDate ? ` • Muddat: ${formatDate(p.dueDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                </div>
              );
            })}
            {payments.length === 0 && (
              <p className="text-center text-[var(--muted-foreground)] text-sm py-8">To'lovlar yo'q</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}