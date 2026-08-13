"use client";
import React, { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { subjectsApi, teachersApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface SubjectOption { id: string; name: string; }
interface TeacherOption { id: string; fullName: string; }
interface GroupDetail {
  id: string; name: string; subjectId: string; teacherId: string;
  capacity: number; monthlyFee: number; status: "ACTIVE" | "FULL" | "CLOSED"; description?: string | null;
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => groupsApi.getById(id).then((r) => r.data as GroupDetail),
  });

  const { data: subjectsRes } = useQuery({
    queryKey: ["subjects-options"],
    queryFn: () => subjectsApi.getAll().then((r) => r.data as SubjectOption[]),
  });
  const subjects = subjectsRes ?? [];

  const { data: teachersRes } = useQuery({
    queryKey: ["teachers-options"],
    queryFn: () => teachersApi.getAll({ limit: 100 }).then((r) => r.data as { data: TeacherOption[] }),
  });
  const teachers = teachersRes?.data ?? [];

  const [form, setForm] = React.useState({
    name: "", subjectId: "", teacherId: "", capacity: "", monthlyFee: "",
    status: "ACTIVE" as "ACTIVE" | "FULL" | "CLOSED", description: "",
  });
  const [nameError, setNameError] = React.useState("");

  React.useEffect(() => {
    if (group) {
      setForm({
        name: group.name,
        subjectId: group.subjectId,
        teacherId: group.teacherId,
        capacity: String(group.capacity),
        monthlyFee: String(group.monthlyFee),
        status: group.status,
        description: group.description || "",
      });
    }
  }, [group]);

  const mutation = useMutation({
    mutationFn: () =>
      groupsApi.update(id, {
        name: form.name,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        capacity: Number(form.capacity),
        monthlyFee: Number(form.monthlyFee),
        status: form.status,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      toast.success("Guruh ma'lumotlari yangilandi");
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push(`/admin/groups/${id}`);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  const handleSave = () => {
    if (!form.name || form.name.length < 2) { setNameError("Kamida 2 ta belgi"); return; }
    setNameError("");
    if (!form.subjectId) { toast.error("Fanni tanlang"); return; }
    if (!form.teacherId) { toast.error("O'qituvchini tanlang"); return; }
    if (!form.capacity || Number(form.capacity) < 1) { toast.error("Sig'imni kiriting"); return; }
    mutation.mutate();
  };

  if (isLoading || !group) {
    return <div className="max-w-2xl"><p className="text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/admin/groups/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Guruhni tahrirlash</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{group.name}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Asosiy ma'lumotlar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Guruh nomi *" name="name" error={nameError} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

            <div>
              <label className="text-sm font-medium mb-1.5 block">Fan *</label>
              <Select value={form.subjectId} onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Fanni tanlang" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">O'qituvchi *</label>
              <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
                <SelectTrigger><SelectValue placeholder="O'qituvchini tanlang" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Holat</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as "ACTIVE" | "FULL" | "CLOSED" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="FULL">To'lgan</SelectItem>
                  <SelectItem value="CLOSED">Yopilgan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Sig'imi (o'quvchi) *" type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
              <Input label="Oylik to'lov (so'm) *" type="number" value={form.monthlyFee} onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Qo'shimcha</CardTitle></CardHeader>
          <CardContent>
            <Textarea label="Tavsif (ixtiyoriy)" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href={`/admin/groups/${id}`}>
            <Button type="button" variant="outline">Bekor qilish</Button>
          </Link>
          <Button type="button" onClick={handleSave} loading={mutation.isPending}>
            <Save className="h-4 w-4" />Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}
