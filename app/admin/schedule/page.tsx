"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { schedulesApi, groupsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getDayShort } from "@/lib/utils";
import type { DayOfWeek } from "@/types";
import toast from "react-hot-toast";

interface WeeklyItem {
  id: string;
  groupId: string;
  groupName: string;
  subjectName: string | null;
  teacherName: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
  studentCount: number;
}

interface GroupOption { id: string; name: string; }

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-pink-100 text-pink-800 border-pink-200",
];

function colorForSubject(name: string | null) {
  if (!name) return "bg-gray-100 text-gray-800 border-gray-200";
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[hash];
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { groupId: "", dayOfWeek: "MON" as DayOfWeek, startTime: "09:00", endTime: "11:00", room: "" };

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const { data: weekly = {} as Record<DayOfWeek, WeeklyItem[]>, isLoading } = useQuery({
    queryKey: ["schedules-weekly"],
    queryFn: () => schedulesApi.getWeekly().then((r) => r.data as Record<DayOfWeek, WeeklyItem[]>),
  });

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const getSchedulesForDay = (day: DayOfWeek) => weekly[day] ?? [];
  const allSchedules = DAYS.flatMap((d) => getSchedulesForDay(d));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["schedules-weekly"] });

  const createMutation = useMutation({
    mutationFn: () => schedulesApi.create({ ...form, room: form.room || undefined }),
    onSuccess: () => { toast.success("Dars qo'shildi"); invalidate(); setOpen(false); setForm(emptyForm); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.delete(id),
    onSuccess: () => { toast.success("O'chirildi"); invalidate(); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleCreate = () => {
    if (!form.groupId) { toast.error("Guruhni tanlang"); return; }
    createMutation.mutate();
  };

  const handleDelete = async (id: string) => {
    if (await confirm("Darsni jadvaldan o'chirishni tasdiqlaysizmi?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dars jadvali</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Haftalik ko'rinish</p>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4" />Dars qo'shish</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS.map((day) => {
            const daySchedules = getSchedulesForDay(day);
            return (
              <div key={day} className="space-y-2">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)] mb-1">{getDayShort(day)}</p>
                  <div className={`w-full h-0.5 rounded-full ${daySchedules.length > 0 ? "bg-[#1E3A5F]" : "bg-[var(--border)]"}`} />
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {daySchedules.length === 0 ? (
                    <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                      Dars yo'q
                    </div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div key={schedule.id} className={`p-2.5 rounded-lg border text-xs hover:shadow-sm transition-shadow ${colorForSubject(schedule.subjectName)}`}>
                        <p className="font-semibold truncate">{schedule.groupName}</p>
                        <p className="mt-0.5 opacity-80">{schedule.startTime}–{schedule.endTime}</p>
                        <p className="opacity-80 truncate">{schedule.teacherName}</p>
                        {schedule.room && <p className="opacity-60">{schedule.room}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Barcha darslar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allSchedules.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Darslar topilmadi</p>}
            {allSchedules.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                <div className="w-12 text-center">
                  <p className="text-xs font-semibold text-[#1E3A5F]">{getDayShort(s.dayOfWeek)}</p>
                </div>
                <div className="w-24 text-xs text-[var(--muted-foreground)]">
                  {s.startTime} – {s.endTime}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.groupName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{s.teacherName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--muted-foreground)]">{s.room}</p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>Yangi dars</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Guruh *</label>
            <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
              <SelectTrigger><SelectValue placeholder="Guruhni tanlang" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kun *</label>
            <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v as DayOfWeek }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => <SelectItem key={d} value={d}>{getDayShort(d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Boshlanish vaqti</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tugash vaqti</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
            </div>
          </div>
          <Input label="Xona" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="201-xona" />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleCreate} loading={createMutation.isPending}>Qo'shish</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}