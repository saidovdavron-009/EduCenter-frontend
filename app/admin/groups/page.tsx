"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Pencil, Trash2, Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface GroupRow {
  id: string;
  name: string;
  subjectName: string | null;
  teacherName: string | null;
  currentCount: number;
  capacity: number;
  monthlyFee: number;
  status: "ACTIVE" | "FULL" | "CLOSED";
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const { data } = useQuery({
    queryKey: ["groups", { search, statusFilter }],
    queryFn: () =>
      groupsApi
        .getAll({
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          limit: 100,
        })
        .then((r) => r.data as { data: GroupRow[]; meta: { total: number } }),
    placeholderData: (prev) => prev,
  });

  const groups = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Guruh o'chirildi");
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
          <h1 className="text-xl sm:text-2xl font-bold">Guruhlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Jami {total} ta guruh</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/students/new?back=/admin/groups">
            <Button size="sm" variant="outline"><UserPlus className="h-4 w-4" />Yangi o'quvchi</Button>
          </Link>
          <Link href="/admin/groups/new">
            <Button size="sm"><Plus className="h-4 w-4" />Yangi guruh</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Guruh nomi bo'yicha..." />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="FULL">To'lgan</SelectItem>
            <SelectItem value="CLOSED">Yopilgan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Guruh nomi</TableHead>
              <TableHead>O'qituvchi</TableHead>
              <TableHead>O'quvchilar</TableHead>
              <TableHead>Oylik to'lov</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                  Guruhlar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              groups.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{row.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{row.subjectName || "—"}</p>
                  </TableCell>
                  <TableCell><span className="text-sm">{row.teacherName || "—"}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{row.currentCount} / {row.capacity}</span>
                      <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1E3A5F] rounded-full"
                          style={{ width: `${Math.min((row.currentCount / row.capacity) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-medium">{formatCurrency(row.monthlyFee)}</span></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/groups/${row.id}`}>
                        <Button variant="ghost" size="icon-sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/admin/groups/${row.id}/edit?back=/admin/groups`}>
                        <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
                      </Link>
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
    </div>
  );
}
