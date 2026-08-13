"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPhone } from "@/lib/utils";
import { parentsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface ParentRow { id: string; fullName: string; phone: string; loginId: string | null; }

export default function ParentsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = React.useState("");

  const { data } = useQuery({
    queryKey: ["parents", { search }],
    queryFn: () =>
      parentsApi.getAll({ search: search || undefined, limit: 100 }).then((r) => r.data as { data: ParentRow[]; meta: { total: number } }),
    placeholderData: (prev) => prev,
  });

  const parents = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => parentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Ota-ona o'chirildi");
    },
    onError: () => toast.error("O'chirishda xatolik yuz berdi"),
  });

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Ota-onalar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Jami {total} ta ota-ona</p>
        </div>
        <Link href="/admin/parents/new">
          <Button size="sm"><Plus className="h-4 w-4" />Yangi ota-ona</Button>
        </Link>
      </div>

      <div className="max-w-xs">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha..." />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Ota-ona</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Login ID</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-[var(--muted-foreground)]">
                  Ota-onalar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              parents.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={row.fullName} size="sm" />
                      <p className="font-medium text-sm">{row.fullName}</p>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm">{formatPhone(row.phone)}</span></TableCell>
                  <TableCell><span className="text-sm font-mono text-[var(--muted-foreground)]">{row.loginId || "—"}</span></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}