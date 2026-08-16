"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { parentsApi, studentsApi } from "@/lib/api";
import { formatPhoneInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

const parentSchema = z.object({
  fullName: z.string().min(3, "Ism kamida 3 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
});

type ParentFormData = z.infer<typeof parentSchema>;
interface StudentOption { id: string; fullName: string; }
interface CreatedCredentials { loginId: string; tempPassword: string; }

export default function NewParentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 100 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ParentFormData) =>
      parentsApi.create({ ...data, studentId: studentId || undefined }).then((r) => r.data as { loginId: string; tempPassword: string }),
    onSuccess: (data) => {
      toast.success("Ota-ona muvaffaqiyatli qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setCreated({ loginId: data.loginId, tempPassword: data.tempPassword });
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const message = err?.response?.data?.message;
      toast.error((Array.isArray(message) ? message[0] : message) || "Xatolik yuz berdi");
    },
  });

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`ID: ${created.loginId}\nParol: ${created.tempPassword}`);
    toast.success("Kirish ma'lumotlari nusxalandi!");
  };

  if (created) {
    return (
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center gap-3">
          <Link href="/admin/parents">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">Ota-ona yaratildi</h1>
        </div>

        <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-6">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-semibold">Hisob muvaffaqiyatli yaratildi</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Login ID</p>
              <span className="font-mono font-bold text-[#1E3A5F] text-lg bg-[#1E3A5F]/10 px-3 py-1 rounded-lg block w-fit">
                {created.loginId}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Parol</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#1E3A5F] text-lg bg-[#1E3A5F]/10 px-3 py-1 rounded-lg">
                  {showPassword ? created.tempPassword : "••••••"}
                </span>
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[var(--muted-foreground)] hover:text-[#1E3A5F] transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copyCredentials} className="mt-4">
            <Copy className="h-4 w-4" />
            Nusxalash
          </Button>
          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            Bu ID va parolni ota-onaga bering. Bu ma'lumotlar boshqa hech qayerda ko'rsatilmaydi — saqlab qo'ying.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button onClick={() => router.push("/admin/parents")}>Ota-onalar ro'yxatiga o'tish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/parents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Yangi ota-ona</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Ota-ona akkauntini yarating</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-sm text-[var(--muted-foreground)]">
        Saqlangandan so'ng tizimga kirish uchun ID raqami va parol avtomatik yaratiladi va sizga ko'rsatiladi.
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Shaxsiy ma'lumotlar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="To'liq ismi *" placeholder="Ism Familya" error={errors.fullName?.message} {...register("fullName")} />
            </div>
            <Input label="Telefon *" placeholder="+998 90 123 45 67" error={errors.phone?.message} {...register("phone", { onChange: (e) => { e.target.value = formatPhoneInput(e.target.value); } })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Farzandi (ixtiyoriy)</CardTitle></CardHeader>
          <CardContent>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="O'quvchini tanlang" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/parents">
            <Button variant="outline">Bekor qilish</Button>
          </Link>
          <Button type="submit" loading={mutation.isPending}>
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </form>
    </div>
  );
}
