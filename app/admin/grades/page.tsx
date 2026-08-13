"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BookMarked, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { gradesApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GradeType = "HOMEWORK" | "CLASSWORK" | "TEST" | "EXAM";

interface GradeRow {
  id: string;
  groupId?: string;
  studentName: string;
  teacherName: string | null;
  type: GradeType;
  score: number;
  maxScore: number;
  date: string;
  comment?: string;
}

interface GroupOption { id: string; name: string; }
interface GroupStudent { id: string; fullName: string; }
interface GroupDetail { teacherId: string; students: GroupStudent[]; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const EMPTY_STUDENTS: GroupStudent[] = [];
const RANGES: { label: string; min: number }[] = [
  { label: "91-100", min: 91 },
  { label: "81-90", min: 81 },
  { label: "71-80", min: 71 },
  { label: "61-70", min: 61 },
  { label: "51-60", min: 51 },
  { label: "0-50", min: 0 },
];

const emptyForm = {
  groupId: "",
  studentId: "",
  type: "HOMEWORK" as GradeType,
  score: "",
  maxScore: "100",
  date: new Date().toISOString().split("T")[0],
  comment: "",
};

export default function GradesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editStudentName, setEditStudentName] = React.useState("");
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["grades"],
    queryFn: () => gradesApi.getAll({ limit: 100 }).then((r) => r.data as { data: GradeRow[]; meta: { total: number } }),
  });
  const grades = data?.data ?? [];

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const { data: selectedGroup } = useQuery({
    queryKey: ["group-detail", form.groupId],
    queryFn: () => groupsApi.getById(form.groupId).then((r) => r.data as GroupDetail),
    enabled: !!form.groupId,
  });
  const groupStudents = selectedGroup?.students ?? EMPTY_STUDENTS;

  const createMutation = useMutation({
    mutationFn: () => {
      return gradesApi.create({
        studentId: form.studentId,
        groupId: form.groupId,
        teacherId: selectedGroup?.teacherId,
        type: form.type,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        date: form.date,
        comment: form.comment || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Baho saqlandi");
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => gradesApi.update(editId as string, {
      type: form.type,
      score: Number(form.score),
      maxScore: Number(form.maxScore),
      date: form.date,
      comment: form.comment || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Baho yangilandi");
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Baho o'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (row: GradeRow & { groupId?: string }) => {
    setEditId(row.id);
    setEditStudentName(row.studentName);
    setForm({
      groupId: row.groupId || "",
      studentId: "",
      type: row.type,
      score: String(row.score),
      maxScore: String(row.maxScore),
      date: row.date.slice(0, 10),
      comment: row.comment || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirm("Bahoni o'chirishni tasdiqlaysizmi?")) deleteMutation.mutate(id);
  };

  const handleAdd = () => {
    if (editId) {
      if (!form.score) { toast.error("Ballni kiriting"); return; }
      updateMutation.mutate();
      return;
    }
    if (!form.groupId || !form.studentId || !form.score) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    createMutation.mutate();
  };

  const gradeChartData = RANGES.map(({ label, min }, i) => {
    const max = i === 0 ? 101 : RANGES[i - 1].min;
    return { range: label, count: grades.filter((g) => {
      const pct = (g.score / g.maxScore) * 100;
      return pct >= min && pct < max;
    }).length };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Baholar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">O'quvchilar baholari</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />Baho qo'yish
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Baholar taqsimoti</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gradeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="O'quvchilar soni" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>O'quvchi</TableHead>
              <TableHead>O'qituvchi</TableHead>
              <TableHead>Tur</TableHead>
              <TableHead>Ball</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Izoh</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">
                  Baholar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              grades.map((row) => {
                const pct = Math.round((row.score / row.maxScore) * 100);
                const color = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500";
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={row.studentName} size="sm" />
                        <span className="text-sm font-medium">{row.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-[var(--muted-foreground)]">{row.teacherName || "—"}</span></TableCell>
                    <TableCell><span className="text-sm">{getStatusLabel(row.type)}</span></TableCell>
                    <TableCell>
                      <span className={`font-bold text-sm ${color}`}>{row.score}/{row.maxScore}</span>
                      <span className="text-xs text-[var(--muted-foreground)] ml-1">({pct}%)</span>
                    </TableCell>
                    <TableCell><span className="text-sm text-[var(--muted-foreground)]">{formatDate(row.date)}</span></TableCell>
                    <TableCell><span className="text-sm text-[var(--muted-foreground)]">{row.comment || "—"}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editId ? "Bahoni tahrirlash" : "Baho qo'yish"}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            {editId ? (
              <div>
                <label className="text-sm font-medium mb-1.5 block">O'quvchi</label>
                <p className="text-sm font-semibold py-2">{editStudentName}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Guruh *</label>
                  <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v, studentId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Guruh tanlang" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">O'quvchi *</label>
                  <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))} disabled={!form.groupId}>
                    <SelectTrigger><SelectValue placeholder="O'quvchi tanlang" /></SelectTrigger>
                    <SelectContent>
                      {groupStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tur</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as GradeType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOMEWORK">Uy vazifasi</SelectItem>
                  <SelectItem value="CLASSWORK">Sinfda ish</SelectItem>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="EXAM">Imtihon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ball *" type="number" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} />
              <Input label="Maksimum" type="number" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))} />
            </div>
            <Input label="Sana" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Textarea label="Izoh" rows={2} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditId(null); }}>Bekor qilish</Button>
            <Button onClick={handleAdd} loading={createMutation.isPending || updateMutation.isPending}><BookMarked className="h-4 w-4" />Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}