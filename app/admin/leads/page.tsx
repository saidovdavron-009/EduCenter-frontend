"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatPhone, formatPhoneInput } from "@/lib/utils";
import { leadsApi, subjectsApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

type LeadStatus = "NEW" | "CONTACTED" | "TRIAL_LESSON" | "REGISTERED" | "CLOSED";

interface LeadRow {
  id: string;
  fullName: string;
  phone: string;
  sourceId: string | null;
  status: LeadStatus;
  interestSubjectId: string | null;
  notes: string | null;
  createdAt: string;
}
interface SourceOption { id: string; name: string; }
interface SubjectOption { id: string; name: string; }
interface StudentOption { id: string; fullName: string; }

const statusConfig: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: "Yangi", color: "text-blue-700", bg: "bg-blue-100" },
  CONTACTED: { label: "Bog'lanildi", color: "text-amber-700", bg: "bg-amber-100" },
  TRIAL_LESSON: { label: "Sinov darsi", color: "text-purple-700", bg: "bg-purple-100" },
  REGISTERED: { label: "Ro'yxatdan o'tdi", color: "text-green-700", bg: "bg-green-100" },
  CLOSED: { label: "Yopildi", color: "text-gray-600", bg: "bg-gray-100" },
};
const statuses: LeadStatus[] = ["NEW", "CONTACTED", "TRIAL_LESSON", "REGISTERED", "CLOSED"];

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const NO_SOURCE = "__none__";
const NO_SUBJECT = "__none__";
const ADD_NEW_SOURCE = "__add_new__";
const emptyForm = { fullName: "", phone: "", sourceId: NO_SOURCE, interestSubjectId: NO_SUBJECT, notes: "" };

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [addingSource, setAddingSource] = React.useState(false);
  const [newSourceName, setNewSourceName] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<"ALL" | LeadStatus>("ALL");
  const [convertLeadId, setConvertLeadId] = React.useState<string | null>(null);
  const [convertStudentId, setConvertStudentId] = React.useState("");

  const { data } = useQuery({
    queryKey: ["leads", { status: filterStatus }],
    queryFn: () => leadsApi.getAll({ status: filterStatus === "ALL" ? undefined : filterStatus, limit: 100 }).then((r) => r.data as { data: LeadRow[]; meta: { total: number } }),
  });
  const leads = data?.data ?? [];

  const { data: sourcesRes } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: () => leadsApi.getSources().then((r) => r.data as { data: SourceOption[] }),
  });
  const sources = sourcesRes?.data ?? [];
  const sourceMap = React.useMemo(() => new Map(sources.map((s) => [s.id, s.name])), [sources]);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-options"],
    queryFn: () => subjectsApi.getAll().then((r) => r.data as SubjectOption[]),
  });
  const subjectMap = React.useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];

  const createSourceMutation = useMutation({
    mutationFn: (name: string) => leadsApi.createSource({ name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      const newSource = res.data as { id: string };
      setForm((f) => ({ ...f, sourceId: newSource.id }));
      setNewSourceName("");
      setAddingSource(false);
      toast.success("Manba qo'shildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      leadsApi.create({
        fullName: form.fullName,
        phone: form.phone,
        sourceId: form.sourceId === NO_SOURCE ? undefined : form.sourceId,
        interestSubjectId: form.interestSubjectId === NO_SUBJECT ? undefined : form.interestSubjectId,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => leadsApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const convertMutation = useMutation({
    mutationFn: () => leadsApi.convert(convertLeadId!, { studentId: convertStudentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead o'quvchiga aylantirildi");
      setConvertLeadId(null);
      setConvertStudentId("");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!form.fullName || !form.phone) { toast.error("Ism va telefon raqamni kiriting"); return; }
    createMutation.mutate();
  };

  const moveStatus = (lead: LeadRow, dir: 1 | -1) => {
    const idx = statuses.indexOf(lead.status);
    const next = statuses[idx + dir];
    if (!next) return;
    if (next === "REGISTERED") {
      setConvertLeadId(lead.id);
      return;
    }
    updateStatusMutation.mutate({ id: lead.id, status: next });
  };

  const handleSourceChange = (v: string) => {
    if (v === ADD_NEW_SOURCE) { setAddingSource(true); return; }
    setForm((f) => ({ ...f, sourceId: v }));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">CRM — Lidlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{leads.filter((l) => l.status === "NEW").length} ta yangi lid</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Lid qo'shish</Button>
      </div>

      {/* Funnel stats */}
      <div className="grid grid-cols-5 gap-2">
        {statuses.map((s) => {
          const cfg = statusConfig[s];
          const count = leads.filter((l) => l.status === s).length;
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "ALL" : s)}
              className={`p-3 rounded-xl border text-center transition-all ${filterStatus === s ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50"}`}>
              <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {leads.map((lead) => {
          const cfg = statusConfig[lead.status];
          const statusIdx = statuses.indexOf(lead.status);
          return (
            <div key={lead.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{lead.fullName}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  {lead.sourceId && <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">{sourceMap.get(lead.sourceId) ?? "—"}</span>}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.phone)}</span>
                  {lead.interestSubjectId && <span>{subjectMap.get(lead.interestSubjectId) ?? "—"}</span>}
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
                {lead.notes && <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">{lead.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {statusIdx > 0 && (
                  <button onClick={() => moveStatus(lead, -1)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] rotate-180">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {statusIdx < statuses.length - 1 && (
                  <button onClick={() => moveStatus(lead, 1)} className="p-1.5 rounded-lg hover:bg-[#1E3A5F]/10 text-[#1E3A5F]">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {leads.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Lidlar yo'q</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Yangi lid</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <Input label="To'liq ism *" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Ism Familiya" />
            <Input label="Telefon *" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))} placeholder="+998 90 ..." />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Manba</label>
                {addingSource ? (
                  <div className="flex gap-1.5">
                    <Input value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Instagram" autoFocus />
                    <Button size="sm" className="shrink-0" loading={createSourceMutation.isPending} onClick={() => newSourceName.trim() && createSourceMutation.mutate(newSourceName.trim())}>+</Button>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setAddingSource(false); setNewSourceName(""); }}>×</Button>
                  </div>
                ) : (
                  <Select value={form.sourceId} onValueChange={handleSourceChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SOURCE}>Noma'lum</SelectItem>
                      {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      <SelectItem value={ADD_NEW_SOURCE}>+ Yangi manba qo'shish</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Fan</label>
                <Select value={form.interestSubjectId} onValueChange={(v) => setForm((f) => ({ ...f, interestSubjectId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUBJECT}>Noma'lum</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input label="Izoh" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Qo'shimcha ma'lumot..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSave} loading={createMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertLeadId} onOpenChange={(v) => !v && setConvertLeadId(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>O'quvchiga aylantirish</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">Bu lidni "Ro'yxatdan o'tdi" holatiga o'tkazish uchun avval tizimda mavjud o'quvchi hisobini tanlang (agar hali yaratilmagan bo'lsa, avval O'quvchilar bo'limida yarating).</p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">O'quvchi *</label>
              <Select value={convertStudentId} onValueChange={setConvertStudentId}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertLeadId(null)}>Bekor qilish</Button>
            <Button onClick={() => convertMutation.mutate()} loading={convertMutation.isPending} disabled={!convertStudentId}>Aylantirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}