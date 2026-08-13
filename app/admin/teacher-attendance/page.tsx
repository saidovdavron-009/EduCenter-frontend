"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, XCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teacherAttendanceApi, teachersApi } from "@/lib/api";
import toast from "react-hot-toast";

type AttStatus = "ON_TIME" | "LATE" | "ABSENT";

interface AttRow {
  id: string;
  teacherId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttStatus | null;
  note: string | null;
}
interface TeacherOption { id: string; fullName: string; }

const statusConfig: Record<AttStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  ON_TIME: { label: "O'z vaqtida", variant: "success" },
  LATE: { label: "Kechikkan", variant: "warning" },
  ABSENT: { label: "Kelmagan", variant: "destructive" },
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const emptyForm = { teacherId: "", status: "ON_TIME" as AttStatus, checkIn: "", checkOut: "", note: "" };

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedDate, setSelectedDate] = React.useState(todayStr());
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["teacher-attendance", { selectedDate }],
    queryFn: () =>
      teacherAttendanceApi.getAll({ dateFrom: selectedDate, dateTo: selectedDate, limit: 200 })
        .then((r) => r.data as { data: AttRow[]; meta: { total: number } }),
  });
  const records = data?.data ?? [];

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 200 }).then((r) => r.data as { data: TeacherOption[] }),
  });
  const teachers = teachersRes?.data ?? [];
  const teacherMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.fullName])), [teachers]);

  const onTime = records.filter((a) => a.status === "ON_TIME").length;
  const late = records.filter((a) => a.status === "LATE").length;
  const absent = records.filter((a) => a.status === "ABSENT").length;

  const createMutation = useMutation({
    mutationFn: () => teacherAttendanceApi.create({
      teacherId: form.teacherId,
      date: selectedDate,
      checkIn: form.checkIn || undefined,
      checkOut: form.checkOut || undefined,
      status: form.status,
      note: form.note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] });
      toast.success("Davomat belgilandi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherAttendanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.teacherId) { toast.error("O'qituvchini tanlang"); return; }
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
          <h1 className="text-xl sm:text-2xl font-bold">O'qituvchilar davomati</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Kunlik kirish/chiqish vaqtlari</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4" />Belgilash</Button>
      </div>

      <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="max-w-[200px]" />

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-green-600">{onTime}</p><p className="text-xs text-[var(--muted-foreground)]">O'z vaqtida</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-amber-500">{late}</p><p className="text-xs text-[var(--muted-foreground)]">Kechikkan</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-red-500">{absent}</p><p className="text-xs text-[var(--muted-foreground)]">Kelmagan</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {records.map((a) => {
          const cfg = a.status ? statusConfig[a.status] : null;
          const name = teacherMap.get(a.teacherId) ?? "Noma'lum";
          return (
            <div key={a.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
              <UserAvatar name={name} size="md" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{name}</p>
                <div className="flex gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                  {a.checkIn ? (
                    <>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Kirdi: {a.checkIn}</span>
                      {a.checkOut && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Chiqdi: {a.checkOut}</span>}
                    </>
                  ) : (
                    <span>Vaqt kiritilmagan</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {cfg && <Badge variant={cfg.variant}>{cfg.label}</Badge>}
                <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
        {records.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Bu sana uchun ma'lumot yo'q</div>}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>Davomat belgilash — {selectedDate}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">O'qituvchi *</label>
            <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
              <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Holat</label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as AttStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ON_TIME">O'z vaqtida</SelectItem>
                <SelectItem value="LATE">Kechikkan</SelectItem>
                <SelectItem value="ABSENT">Kelmagan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.status !== "ABSENT" && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kirish vaqti" type="time" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
              <Input label="Chiqish vaqti" type="time" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
            </div>
          )}
          <Input label="Izoh" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ixtiyoriy" />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}