"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { subjectsApi, teachersApi, groupsApi, schedulesApi } from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  subjectId: z.string().min(1, "Fanni tanlang"),
  teacherId: z.string().min(1, "O'qituvchini tanlang"),
  capacity: z.coerce.number().min(1).max(30),
  monthlyFee: z.coerce.number().min(0),
  room: z.string().optional(),
  description: z.string().optional(),
});

type FormData = {
  name: string;
  subjectId: string;
  teacherId: string;
  capacity: number;
  monthlyFee: number;
  room?: string;
  description?: string;
};

interface SubjectOption { id: string; name: string; }
interface TeacherOption { id: string; fullName: string; }

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS: Record<string, string> = {
  MON: "Dushanba", TUE: "Seshanba", WED: "Chorshanba",
  THU: "Payshanba", FRI: "Juma", SAT: "Shanba",
};

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function NewGroupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("11:00");
  const [subjectId, setSubjectId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { capacity: 12 as any, monthlyFee: 500000 as any }
  });

  const onSubjectChange = (v: string) => {
    setSubjectId(v);
    setValue("subjectId", v, { shouldValidate: true });
  };

  const onTeacherChange = (v: string) => {
    setTeacherId(v);
    setValue("teacherId", v, { shouldValidate: true });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { room, ...groupPayload } = data;
      const { data: group } = await groupsApi.create(groupPayload);
      await Promise.all(
        selectedDays.map((day) =>
          schedulesApi.create({ groupId: group.id, dayOfWeek: day, startTime, endTime, room: data.room || undefined })
        )
      );
      return group;
    },
    onSuccess: (group) => {
      toast.success(`"${group.name}" guruhi yaratildi`);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/admin/groups");
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  const onSubmit = (data: FormData) => {
    if (selectedDays.length === 0) {
      toast.error("Kamida bitta kun tanlang");
      return;
    }
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Yangi guruh</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Yangi o'quv guruhini yaratish</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Asosiy ma'lumotlar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Guruh nomi *" placeholder="Ingliz tili A2" error={errors.name?.message} {...register("name")} />

            <div>
              <label className="text-sm font-medium mb-1.5 block">Fan *</label>
              <Select value={subjectId} onValueChange={onSubjectChange}>
                <SelectTrigger className={errors.subjectId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Fanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("subjectId")} />
              {errors.subjectId && <p className="text-xs text-red-500 mt-1">{errors.subjectId.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">O'qituvchi *</label>
              <Select value={teacherId} onValueChange={onTeacherChange}>
                <SelectTrigger className={errors.teacherId ? "border-red-500" : ""}>
                  <SelectValue placeholder="O'qituvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("teacherId")} />
              {errors.teacherId && <p className="text-xs text-red-500 mt-1">{errors.teacherId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Sig'imi (o'quvchi) *" type="number" error={errors.capacity?.message} {...register("capacity")} />
              <Input label="Oylik to'lov (so'm) *" type="number" error={errors.monthlyFee?.message} {...register("monthlyFee")} />
            </div>

            <Input label="Xona" placeholder="201-xona" {...register("room")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dars jadvali</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Dars kunlari *</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedDays.includes(day) ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "border-[var(--border)] hover:border-[#1E3A5F]"}`}>
                    {DAY_LABELS[day].slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Boshlanish vaqti</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tugash vaqti</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Qo'shimcha</CardTitle></CardHeader>
          <CardContent>
            <Textarea label="Tavsif (ixtiyoriy)" placeholder="Guruh haqida qo'shimcha ma'lumot..." rows={3} {...register("description")} />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>Bekor qilish</Button>
          <Button type="submit" loading={mutation.isPending}>Guruh yaratish</Button>
        </div>
      </form>
    </div>
  );
}