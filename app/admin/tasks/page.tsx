"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Circle, Check, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { tasksApi, teachersApi } from "@/lib/api";
import toast from "react-hot-toast";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
}
interface StaffOption { id: string; userId: string; fullName: string; }

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: "Past", color: "text-green-600 bg-green-100" },
  MEDIUM: { label: "O'rta", color: "text-amber-600 bg-amber-100" },
  HIGH: { label: "Yuqori", color: "text-red-600 bg-red-100" },
};

const statusConfig: Record<TaskStatus, { label: string; icon: React.ReactNode }> = {
  TODO: { label: "Bajarilishi kerak", icon: <Circle className="h-4 w-4 text-gray-400" /> },
  IN_PROGRESS: { label: "Jarayonda", icon: <Clock className="h-4 w-4 text-amber-500" /> },
  DONE: { label: "Bajarildi", icon: <Check className="h-4 w-4 text-green-600" /> },
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const emptyForm = { title: "", description: "", assignedTo: "", priority: "MEDIUM" as Priority, deadline: "" };

export default function TasksPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [filterStatus, setFilterStatus] = React.useState<"ALL" | TaskStatus>("ALL");

  const { data } = useQuery({
    queryKey: ["tasks", { filterStatus }],
    queryFn: () =>
      tasksApi.getAll({ status: filterStatus === "ALL" ? undefined : filterStatus, limit: 100 })
        .then((r) => r.data as { data: TaskRow[]; meta: { total: number } }),
  });
  const tasks = data?.data ?? [];

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 200 }).then((r) => r.data as { data: { id: string; fullName: string }[] }),
  });
  const teacherList = teachersRes?.data ?? [];

  const { data: staff = [] } = useQuery({
    queryKey: ["teachers-with-userid", teacherList.map((t) => t.id).join(",")],
    queryFn: async () => {
      const details = await Promise.all(teacherList.map((t) => teachersApi.getById(t.id)));
      return details.map((r, i) => ({ id: teacherList[i].id, userId: (r.data as { userId: string }).userId, fullName: teacherList[i].fullName })) as StaffOption[];
    },
    enabled: teacherList.length > 0,
  });
  const staffMap = React.useMemo(() => new Map(staff.map((s) => [s.userId, s.fullName])), [staff]);

  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const createMutation = useMutation({
    mutationFn: () => tasksApi.create({
      title: form.title,
      description: form.description || undefined,
      assignedTo: form.assignedTo || undefined,
      priority: form.priority,
      deadline: form.deadline || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Vazifa qo'shildi");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => tasksApi.update(editId as string, {
      title: form.title,
      description: form.description || undefined,
      assignedTo: form.assignedTo || undefined,
      priority: form.priority,
      deadline: form.deadline || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Vazifa yangilandi");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("O'chirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setOpen(true); };

  const openEdit = (task: TaskRow) => {
    setEditId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      priority: task.priority,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.deadline) { toast.error("Sarlavha va muddatni kiriting"); return; }
    if (editId) { updateMutation.mutate(); return; }
    createMutation.mutate();
  };

  const moveStatus = (id: string, next: TaskStatus) => statusMutation.mutate({ id, status: next });

  const handleDelete = async (id: string) => {
    if (!(await confirm("O'chirishni tasdiqlaysizmi?"))) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vazifalar (Staff)</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{todoCount} ta yangi, {inProgressCount} ta jarayonda</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Vazifa berish</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-500">{todoCount}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Bajarilishi kerak</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-500">{inProgressCount}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Jarayonda</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{doneCount}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Bajarildi</p>
        </div>
      </div>

      <div className="flex gap-2">
        {([["ALL", "Barchasi"], ["TODO", "Yangi"], ["IN_PROGRESS", "Jarayonda"], ["DONE", "Bajarildi"]] as const).map(([s, l]) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className={`bg-[var(--card)] border rounded-xl p-4 ${task.status === "DONE" ? "opacity-60 border-[var(--border)]" : "border-[var(--border)]"}`}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => moveStatus(task.id, task.status === "DONE" ? "TODO" : task.status === "TODO" ? "IN_PROGRESS" : "DONE")}
                className="mt-0.5 shrink-0"
              >
                {statusConfig[task.status].icon}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm ${task.status === "DONE" ? "line-through text-[var(--muted-foreground)]" : ""}`}>{task.title}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>{priorityConfig[task.priority].label}</span>
                    <button onClick={() => openEdit(task)} className="p-0.5 hover:text-[#1E3A5F] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(task.id)} className="p-0.5 hover:text-red-500 text-[var(--muted-foreground)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {task.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
                  {task.assignedTo && (
                    <div className="flex items-center gap-1">
                      <UserAvatar name={staffMap.get(task.assignedTo) ?? "?"} size="xl" />
                      {staffMap.get(task.assignedTo) ?? "Noma'lum"}
                    </div>
                  )}
                  {task.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(task.deadline)}</span>}
                </div>
              </div>
            </div>
            {task.status !== "DONE" && (
              <div className="flex gap-2 mt-3 pl-7">
                {task.status === "TODO" && <button onClick={() => moveStatus(task.id, "IN_PROGRESS")} className="text-xs text-amber-600 hover:underline">Boshlash</button>}
                {task.status === "IN_PROGRESS" && <button onClick={() => moveStatus(task.id, "DONE")} className="text-xs text-green-600 hover:underline">Bajarildi deb belgilash</button>}
              </div>
            )}
          </div>
        ))}
        {tasks.length === 0 && <div className="text-center text-[var(--muted-foreground)] py-12">Vazifalar yo'q</div>}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Vazifani tahrirlash" : "Yangi vazifa"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Sarlavha *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Vazifa sarlavhasi" />
          <Input label="Tavsif" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Qo'shimcha ma'lumot..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mas'ul shaxs</label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Muhimlik</label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Past</SelectItem>
                  <SelectItem value="MEDIUM">O'rta</SelectItem>
                  <SelectItem value="HIGH">Yuqori</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input label="Muddat *" type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); }}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}