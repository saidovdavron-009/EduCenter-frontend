"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, User, Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentsApi, groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface GroupOption {
  id: string;
  name: string;
  subjectName: string;
}

interface CreatedCredentials {
  loginId: string;
  tempPassword: string;
}

const studentSchema = z.object({
  fullName: z.string().min(3, "Ism kamida 3 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
  parentPhone: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  address: z.string().optional(),
  groupId: z.string().optional(),
  referralSource: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function NewStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: StudentFormData) => {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== "" && v !== undefined)
      );
      return studentsApi.create(cleaned).then((r) => r.data as { loginId: string; tempPassword: string });
    },
    onSuccess: (data) => {
      toast.success("O'quvchi qo'shildi!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setCreated({ loginId: data.loginId, tempPassword: data.tempPassword });
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  const onSubmit = (data: StudentFormData) => mutation.mutate(data);

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`ID: ${created.loginId}\nParol: ${created.tempPassword}`);
    toast.success("Kirish ma'lumotlari nusxalandi!");
  };

  if (created) {
    return (
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center gap-3">
          <Link href="/admin/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">O'quvchi yaratildi</h1>
          </div>
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
            Bu ID va parolni o'quvchiga bering. Bu ma'lumotlar boshqa hech qayerda ko'rsatilmaydi — saqlab qo'ying.
            O'quvchi tizimga shu ID va parol bilan kiradi.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button onClick={() => router.push("/admin/students")}>O'quvchilar ro'yxatiga o'tish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Yangi o'quvchi</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Yangi o'quvchi akkauntini yarating</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-sm text-[var(--muted-foreground)]">
        Saqlangandan so'ng tizimga kirish uchun ID raqami va parol avtomatik yaratiladi va sizga ko'rsatiladi.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Shaxsiy ma'lumotlar
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="To'liq ismi *"
                placeholder="Ism Familya Otasining ismi"
                error={errors.fullName?.message}
                {...register("fullName")}
              />
            </div>
            <Input
              label="Telefon raqam *"
              placeholder="+998 90 123 45 67"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="Ota-ona telefoni"
              placeholder="+998 90 123 45 67"
              {...register("parentPhone")}
            />
            <Input
              label="Tug'ilgan sana"
              type="date"
              {...register("dob")}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Jinsi</label>
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Erkak</SelectItem>
                  <SelectItem value="FEMALE">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Manzil"
                placeholder="Shahar, tuman"
                {...register("address")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qo'shimcha ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Guruh</label>
              <Select value={watch("groupId") ?? ""} onValueChange={(v) => setValue("groupId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Guruh tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} — {g.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Qayerdan keldi"
              placeholder="Instagram, do'st, e'lon..."
              {...register("referralSource")}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/students">
            <Button variant="outline">Bekor qilish</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </form>
    </div>
  );
}
