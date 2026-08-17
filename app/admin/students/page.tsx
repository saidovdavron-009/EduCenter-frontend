"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Eye, Pencil, Trash2, KeyRound, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { formatDate, formatPhone, getStatusColor, getStatusLabel } from "@/lib/utils";
import { studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || "Xatolik yuz berdi";
}

interface StudentRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  loginId: string | null;
  status: "ACTIVE" | "FROZEN" | "GRADUATED";
  groupCount: number;
  createdAt: string;
}

const PAGE_SIZES = [10, 20, 50];

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [passwordTarget, setPasswordTarget] = React.useState<StudentRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const { data } = useQuery({
    queryKey: ["students", { search, statusFilter, page, pageSize }],
    queryFn: () =>
      studentsApi
        .getAll({
          page,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        })
        .then((r) => r.data as { data: StudentRow[]; meta: { total: number; totalPages: number } }),
    placeholderData: (prev) => prev,
  });

  const students = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("O'quvchi o'chirildi");
    },
    onError: () => toast.error("O'chirishda xatolik yuz berdi"),
  });

  const handleDelete = async (id: string) => {
    if (!(await confirm("Haqiqatan ham o'chirmoqchimisiz?"))) return;
    deleteMutation.mutate(id);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  const resetPasswordMutation = useMutation({
    mutationFn: () => studentsApi.resetPassword(passwordTarget!.id, newPassword),
    onSuccess: () => {
      toast.success("Parol muvaffaqiyatli yangilandi");
      setPasswordTarget(null);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openPasswordModal = (row: StudentRow) => {
    setPasswordTarget(row);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) { toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak"); return; }
    if (newPassword !== confirmPassword) { toast.error("Parollar mos kelmadi"); return; }
    resetPasswordMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'quvchilar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Jami {total} ta o'quvchi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />Export
          </Button>
          <Link href="/admin/students/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />Yangi o'quvchi
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Ism, ID yoki telefon..."
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="FROZEN">Muzlatilgan</SelectItem>
            <SelectItem value="GRADUATED">Tugatgan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>O'quvchi</TableHead>
              <TableHead>Login ID</TableHead>
              <TableHead>Guruhlar</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Qo'shilgan</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                  O'quvchilar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              students.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={row.fullName} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{row.fullName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatPhone(row.phone)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-[var(--muted-foreground)]">{row.loginId || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {row.groupCount > 0 ? `${row.groupCount} ta guruh` : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[var(--muted-foreground)]">{formatDate(row.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/students/${row.id}`}>
                        <Button variant="ghost" size="icon-sm" title="Ko'rish">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/students/${row.id}/edit?back=/admin/students`}>
                        <Button variant="ghost" size="icon-sm" title="Tahrirlash">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon-sm" title="Parolni yangilash"
                        onClick={() => openPasswordModal(row)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon-sm" title="O'chirish"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <span>Sahifada:</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>Jami: {total} ta</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</Button>
          </div>
        </div>
      )}

      <Modal open={!!passwordTarget} onOpenChange={(open) => { if (!open) setPasswordTarget(null); }} size="sm">
        <ModalHeader><ModalTitle>Parolni yangilash</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            {passwordTarget?.fullName} uchun yangi parol o&apos;rnatiladi. Joriy parol talab qilinmaydi.
          </p>
          <Input
            label="Yangi parol *"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Kamida 6 ta belgi"
            rightIcon={
              <button type="button" className="pointer-events-auto" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Input
            label="Yangi parolni takrorlang *"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Parolni qayta kiriting"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPasswordTarget(null)}>Bekor</Button>
          <Button onClick={handleResetPassword} loading={resetPasswordMutation.isPending}>O&apos;zgartirish</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}