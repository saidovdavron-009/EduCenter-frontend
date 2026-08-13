"use client";
import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teachersApi } from "@/lib/api";
import toast from "react-hot-toast";

interface TeacherDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  subjects: string[];
  experience: number | null;
  salaryType: "MONTHLY" | "HOURLY";
  salary: number;
  isActive: boolean;
  bio: string | null;
}

const teacherEditSchema = z.object({
  fullName: z.string().min(3, "Ism kamida 3 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
  email: z.string().optional(),
  subjects: z.string().min(1, "Fan kiriting"),
  experience: z.string().optional(),
  salaryType: z.enum(["HOURLY", "MONTHLY"]),
  salary: z.number().min(0, "Ish haqi kiriting"),
  bio: z.string().optional(),
  isActive: z.enum(["true", "false"]),
});

type TeacherEditFormData = z.infer<typeof teacherEditSchema>;

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => teachersApi.getById(id).then((r) => r.data as TeacherDetail),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TeacherEditFormData>({
    resolver: zodResolver(teacherEditSchema),
    defaultValues: { salaryType: "MONTHLY", isActive: "true" },
  });

  React.useEffect(() => {
    if (teacher) {
      reset({
        fullName: teacher.fullName,
        phone: teacher.phone,
        email: teacher.email || "",
        subjects: (teacher.subjects || []).join(", "),
        experience: teacher.experience != null ? String(teacher.experience) : "",
        salaryType: teacher.salaryType,
        salary: teacher.salary,
        bio: teacher.bio || "",
        isActive: teacher.isActive ? "true" : "false",
      });
    }
  }, [teacher, reset]);

  const mutation = useMutation({
    mutationFn: (data: TeacherEditFormData) =>
      teachersApi.update(id, {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || undefined,
        subjects: data.subjects.split(",").map((s) => s.trim()).filter(Boolean),
        experience: data.experience ? Number(data.experience) : undefined,
        salaryType: data.salaryType,
        salary: data.salary,
        bio: data.bio || undefined,
        isActive: data.isActive === "true",
      }),
    onSuccess: () => {
      toast.success("O'qituvchi ma'lumotlari yangilandi");
      queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      router.push(`/admin/teachers/${id}`);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  if (isLoading || !teacher) {
    return <div className="max-w-3xl"><p className="text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/admin/teachers/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'qituvchini tahrirlash</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{teacher.fullName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Shaxsiy ma'lumotlar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="To'liq ismi *" error={errors.fullName?.message} {...register("fullName")} />
            </div>
            <Input label="Telefon *" error={errors.phone?.message} {...register("phone")} />
            <Input label="Email" {...register("email")} />
            <div className="sm:col-span-2">
              <Input label="Fanlar * (vergul bilan ajrating)" error={errors.subjects?.message} {...register("subjects")} />
            </div>
            <Input label="Tajriba (yil)" type="number" error={errors.experience?.message} {...register("experience")} />
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Holat</label>
              <Select value={watch("isActive")} onValueChange={(v) => setValue("isActive", v as "true" | "false")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Faol</SelectItem>
                  <SelectItem value="false">Nofaol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Input label="Bio" {...register("bio")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ish haqi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Ish haqi turi</label>
              <Select value={watch("salaryType")} onValueChange={(v) => setValue("salaryType", v as "HOURLY" | "MONTHLY")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Link href={`/admin/teachers/${id}`}>
            <Button variant="outline">Bekor qilish</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4" />Saqlash
          </Button>
        </div>
      </form>
    </div>
  );
}
