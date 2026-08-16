"use client";
import React, { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { studentsApi } from "@/lib/api";
import { formatPhoneInput } from "@/lib/utils";
import toast from "react-hot-toast";

interface StudentDetail {
  id: string;
  fullName: string;
  phone: string;
  parentPhone: string | null;
  parentEmail: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | null;
  address: string | null;
  status: "ACTIVE" | "FROZEN" | "GRADUATED";
  referralSource: string | null;
  notes: string | null;
}

const studentEditSchema = z.object({
  fullName: z.string().min(3, "Ism kamida 3 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  address: z.string().optional(),
  status: z.enum(["ACTIVE", "FROZEN", "GRADUATED"]),
  referralSource: z.string().optional(),
  notes: z.string().optional(),
});

type StudentEditFormData = z.infer<typeof studentEditSchema>;

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function EditStudentForm({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = searchParams.get("back") || `/admin/students/${id}`;
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.getById(id).then((r) => r.data as StudentDetail),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<StudentEditFormData>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: { status: "ACTIVE", gender: undefined },
  });

  React.useEffect(() => {
    if (student) {
      reset({
        fullName: student.fullName,
        phone: student.phone,
        parentPhone: student.parentPhone || "",
        parentEmail: student.parentEmail || "",
        dob: student.dob ? student.dob.slice(0, 10) : "",
        gender: student.gender || undefined,
        address: student.address || "",
        status: student.status,
        referralSource: student.referralSource || "",
        notes: student.notes || "",
      });
    }
  }, [student, reset]);

  const mutation = useMutation({
    mutationFn: (data: StudentEditFormData) => {
      const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "" && v !== undefined));
      return studentsApi.update(id, cleaned);
    },
    onSuccess: () => {
      toast.success("O'quvchi ma'lumotlari yangilandi");
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      router.push(`/admin/students/${id}`);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  if (isLoading || !student) {
    return <div className="max-w-3xl"><p className="text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">O'quvchini tahrirlash</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{student.fullName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Shaxsiy ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="To'liq ismi *" error={errors.fullName?.message} {...register("fullName")} />
            </div>
            <Input label="Telefon raqam *" error={errors.phone?.message} {...register("phone", { onChange: (e) => { e.target.value = formatPhoneInput(e.target.value); } })} />
            <Input label="Ota-ona telefoni" {...register("parentPhone")} />
            <Input label="Ota-ona emaili" {...register("parentEmail")} />
            <Input label="Tug'ilgan sana" type="date" {...register("dob")} />
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Jinsi</label>
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Erkak</SelectItem>
                  <SelectItem value="FEMALE">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Holat</label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "ACTIVE" | "FROZEN" | "GRADUATED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="FROZEN">Muzlatilgan</SelectItem>
                  <SelectItem value="GRADUATED">Tugatgan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Input label="Manzil" {...register("address")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Qo'shimcha ma'lumotlar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Qayerdan keldi" {...register("referralSource")} />
            <div className="sm:col-span-2">
              <Input label="Izohlar" {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href={backHref}>
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

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <EditStudentForm id={id} />
    </Suspense>
  );
}
