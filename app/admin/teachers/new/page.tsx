"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { teachersApi, subjectsApi } from "@/lib/api";
import { formatPhoneInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Ism kamida 3 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
  subjects: z.array(z.string()).min(1, "Kamida bitta fan tanlang"),
  experience: z.string().optional(),
  maxGroups: z.string().optional(),
  salaryType: z.enum(["HOURLY", "MONTHLY"]),
  salary: z.number().min(0, "Ish haqi kiriting"),
  bio: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;
interface CreatedCredentials { loginId: string; tempPassword: string; }
interface SubjectOption { id: string; name: string; }

export default function NewTeacherPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { salaryType: "MONTHLY", subjects: [] },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-options"],
    queryFn: () => subjectsApi.getAll().then((r) => r.data as SubjectOption[]),
  });

  const selectedSubjects = watch("subjects") ?? [];
  const toggleSubject = (name: string) => {
    setValue(
      "subjects",
      selectedSubjects.includes(name) ? selectedSubjects.filter((s) => s !== name) : [...selectedSubjects, name],
      { shouldValidate: true },
    );
  };

  const mutation = useMutation({
    mutationFn: (data: TeacherFormData) =>
      teachersApi.create({
        ...data,
        experience: data.experience ? Number(data.experience) : undefined,
        maxGroups: data.maxGroups ? Number(data.maxGroups) : undefined,
      }).then((r) => r.data as { loginId: string; tempPassword: string }),
    onSuccess: (data) => {
      toast.success("O'qituvchi muvaffaqiyatli qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
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
          <Link href="/admin/teachers">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">O'qituvchi yaratildi</h1>
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
            Bu ID va parolni o'qituvchiga bering. Bu ma'lumotlar boshqa hech qayerda ko'rsatilmaydi — saqlab qo'ying.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button onClick={() => router.push("/admin/teachers")}>O'qituvchilar ro'yxatiga o'tish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/teachers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Yangi o'qituvchi</h1>
          <p className="text-sm text-[var(--muted-foreground)]">O'qituvchi akkauntini yarating</p>
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Fanlar *</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => toggleSubject(s.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedSubjects.includes(s.name) ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "border-[var(--border)] hover:border-[#1E3A5F]"}`}>
                    {s.name}
                  </button>
                ))}
                {subjects.length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">Avval "Fanlar" bo'limida fan qo'shing</p>
                )}
              </div>
              {errors.subjects && <p className="mt-1.5 text-xs text-red-500">{errors.subjects.message}</p>}
            </div>
            <Input
              label="Tajriba (yil)"
              type="number"
              placeholder="5"
              error={errors.experience?.message}
              {...register("experience")}
            />
            <Input
              label="Nechta guruhga biriktirish mumkin"
              type="number"
              placeholder="Cheklovsiz"
              error={errors.maxGroups?.message}
              {...register("maxGroups")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ish haqi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Ish haqi turi</label>
              <Select value={watch("salaryType")} onValueChange={(v) => setValue("salaryType", v as "HOURLY" | "MONTHLY")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Oylik</SelectItem>
                  <SelectItem value="HOURLY">Soatbay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label={`Miqdor (${watch("salaryType") === "HOURLY" ? "soat/so'm" : "oy/so'm"})`}
              type="number"
              error={errors.salary?.message}
              {...register("salary", { valueAsNumber: true })}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/teachers">
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
