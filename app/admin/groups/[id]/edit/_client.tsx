"use client";
import React, { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { subjectsApi, teachersApi, branchesApi, groupsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface SubjectOption { id: string; name: string; monthlyFee: number; }
interface TeacherOption { id: string; fullName: string; }
interface BranchOption { id: string; name: string; }
interface GroupDetail {
  id: string; name: string; subjectId: string; teacherId: string; branchId: string | null;
  capacity: number; monthlyFee: number; status: "ACTIVE" | "FULL" | "CLOSED"; description?: string | null;
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function EditGroupForm({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = searchParams.get("back") || `/admin/groups/${id}`;
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

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-options"],
    queryFn: () => branchesApi.getAll({ limit: 100 }).then((r) => r.data as { data: BranchOption[] }),
  });
  const branches = branchesRes?.data ?? [];

  const [form, setForm] = React.useState({
    name: "", subjectId: "", teacherId: "", branchId: "", capacity: "", monthlyFee: "",
    status: "ACTIVE" as "ACTIVE" | "FULL" | "CLOSED", description: "",
  });
  const [nameError, setNameError] = React.useState("");

  const onSubjectChange = (v: string) => {
    const subject = subjects.find((s) => s.id === v);
    setForm((f) => ({ ...f, subjectId: v, monthlyFee: subject ? String(subject.monthlyFee) : f.monthlyFee }));
  };

  React.useEffect(() => {
    if (group) {
      setForm({
        name: group.name,
        subjectId: group.subjectId,
        teacherId: group.teacherId,
        branchId: group.branchId ?? "",
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
        branchId: form.branchId || undefined,
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
        <Link href={backHref}>
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
              <Select value={form.subjectId} onValueChange={onSubjectChange}>
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
              <label className="text-sm font-medium mb-1.5 block">Filial</label>
              <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
                <SelectTrigger><SelectValue placeholder="Filialni tanlang" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
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
              <div>
                <label className="text-sm font-medium mb-1.5 block">Oylik to'lov</label>
                <div className="flex h-9 w-full items-center rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 text-sm text-[var(--foreground)]">
                  {form.monthlyFee ? formatCurrency(Number(form.monthlyFee)) : "Avval fanni tanlang"}
                </div>
              </div>
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
          <Link href={backHref}>
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

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <EditGroupForm id={id} />
    </Suspense>
  );
}
