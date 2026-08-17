"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Pencil, Trash2, KeyRound, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { teachersApi } from "@/lib/api";
import toast from "react-hot-toast";

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || "Xatolik yuz berdi";
}

interface TeacherRow {
  id: string;
  fullName: string;
  phone: string;
  subjects: string[];
  salary: number;
  groupCount: number;
  maxGroups: number | null;
  isActive: boolean;
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ACTIVE");
  const [passwordTarget, setPasswordTarget] = React.useState<TeacherRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const { data } = useQuery({
    queryKey: ["teachers", { search, statusFilter }],
    queryFn: () =>
      teachersApi
        .getAll({ search: search || undefined, status: statusFilter === "ALL" ? undefined : statusFilter, limit: 100 })
        .then((r) => r.data as { data: TeacherRow[]; meta: { total: number } }),
    placeholderData: (prev) => prev,
  });

  const teachers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("O'qituvchi faolligi bekor qilindi");
    },
    onError: () => toast.error("Amalni bajarishda xatolik yuz berdi"),
  });

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'qituvchini nofaol qilishni tasdiqlaysizmi? U kirish imkoniyatini yo'qotadi va faol ro'yxatlarda ko'rinmay qoladi."))) return;
    deleteMutation.mutate(id);
  };

  const resetPasswordMutation = useMutation({
    mutationFn: () => teachersApi.resetPassword(passwordTarget!.id, newPassword),
    onSuccess: () => {
      toast.success("Parol muvaffaqiyatli yangilandi");
      setPasswordTarget(null);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openPasswordModal = (row: TeacherRow) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'qituvchilar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Jami {total} ta o'qituvchi</p>
        </div>
        <Link href="/admin/teachers/new">
          <Button size="sm"><Plus className="h-4 w-4" />Yangi o'qituvchi</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha..."
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="ACTIVE">Faol</SelectItem>
            <SelectItem value="INACTIVE">Nofaol</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>O'qituvchi</TableHead>
              <TableHead>Fanlar</TableHead>
              <TableHead>Ish haqi</TableHead>
              <TableHead>Guruhlar</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                  O'qituvchilar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              teachers.map(row => (
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
                    <div className="flex flex-wrap gap-1">
                      {(row.subjects || []).map(s => (
                        <span key={s} className="bg-[var(--muted)] text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{formatCurrency(row.salary)}</p>
                  </TableCell>
                  <TableCell><span className="text-sm text-[var(--muted-foreground)]">{row.groupCount}{row.maxGroups != null ? ` / ${row.maxGroups}` : ""} ta</span></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {row.isActive ? "Faol" : "Nofaol"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/teachers/${row.id}`}>
                        <Button variant="ghost" size="icon-sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/admin/teachers/${row.id}/edit?back=/admin/teachers`}>
                        <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon-sm" title="Parolni yangilash"
                        onClick={() => openPasswordModal(row)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(row.id)}>
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