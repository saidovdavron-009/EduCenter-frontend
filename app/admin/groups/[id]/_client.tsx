"use client";
import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Clock, BookOpen, UserCircle, Building2, Pencil, Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, getDayShort, getStatusLabel, formatPhoneInput } from "@/lib/utils";
import { groupsApi, subjectsApi, teachersApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface GroupSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

interface GroupStudent {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  status: string;
  joinedAt: string;
}

interface GroupDetail {
  id: string;
  name: string;
  subjectId: string;
  teacherId: string;
  branchName: string | null;
  capacity: number;
  currentCount: number;
  level: string | null;
  monthlyFee: number;
  status: "ACTIVE" | "FULL" | "CLOSED";
  startDate: string | null;
  students: GroupStudent[];
  schedules: GroupSchedule[];
}

interface SubjectOption { id: string; name: string; }

interface NewStudentForm {
  fullName: string;
  phone: string;
  parentPhone: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "";
}

interface CreatedCredentials { loginId: string; tempPassword: string; }

const emptyStudentForm: NewStudentForm = { fullName: "", phone: "", parentPhone: "", dob: "", gender: "" };

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);
  const [studentForm, setStudentForm] = React.useState<NewStudentForm>(emptyStudentForm);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: () => groupsApi.getById(id).then((r) => r.data as GroupDetail),
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects-options"],
    queryFn: () => subjectsApi.getAll().then((r) => r.data as SubjectOption[]),
  });
  const subjectName = subjects?.find((s) => s.id === group?.subjectId)?.name;

  const { data: teacher } = useQuery({
    queryKey: ["teacher", group?.teacherId],
    queryFn: () => teachersApi.getById(group!.teacherId).then((r) => r.data as { fullName: string }),
    enabled: !!group?.teacherId,
  });

  const students = group?.students ?? [];
  const schedules = group?.schedules ?? [];
  const fillPct = group ? Math.round((group.currentCount / group.capacity) * 100) : 0;

  const createStudentMutation = useMutation({
    mutationFn: () => studentsApi.create({
      fullName: studentForm.fullName,
      phone: studentForm.phone,
      parentPhone: studentForm.parentPhone || undefined,
      dob: studentForm.dob || undefined,
      gender: studentForm.gender || undefined,
      groupId: id,
    }).then((r) => r.data as CreatedCredentials),
    onSuccess: (data) => {
      toast.success("O'quvchi yaratildi va guruhga qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      setCreated(data);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAddStudent = () => { setStudentForm(emptyStudentForm); setCreated(null); setShowPassword(false); setAddOpen(true); };

  const handleCreateStudent = () => {
    if (!studentForm.fullName || studentForm.fullName.length < 3) { toast.error("Ism kamida 3 ta belgi"); return; }
    if (!studentForm.phone || studentForm.phone.length < 9) { toast.error("Telefon raqam kiriting"); return; }
    createStudentMutation.mutate();
  };

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`ID: ${created.loginId}\nParol: ${created.tempPassword}`);
    toast.success("Kirish ma'lumotlari nusxalandi!");
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">{group?.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{subjectName || "—"}{group?.level ? ` • ${group.level} darajasi` : ""}</p>
        </div>
        <Badge variant={group?.status === "ACTIVE" ? "success" : "secondary"}>
          {getStatusLabel(group?.status || "ACTIVE")}
        </Badge>
        <Link href={`/admin/groups/${id}/edit?back=/admin/groups/${id}`}>
          <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5" />Tahrirlash</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A5F]">{group?.currentCount ?? 0}</p>
          <p className="text-xs text-[var(--muted-foreground)]">O'quvchilar</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{Math.max((group?.capacity ?? 0) - (group?.currentCount ?? 0), 0)}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Bo'sh joy</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold text-green-600">{fillPct}%</p>
          <p className="text-xs text-[var(--muted-foreground)]">To'lganlik</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-lg font-bold text-[#1E3A5F]">{formatCurrency(group?.monthlyFee ?? 0)}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Oylik to'lov</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Guruh ma'lumotlari</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <UserCircle className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
              <span className="text-[var(--muted-foreground)]">O'qituvchi:</span>
              <button onClick={() => group && router.push(`/admin/teachers/${group.teacherId}`)}
                className="font-medium text-[#1E3A5F] hover:underline truncate">
                {teacher?.fullName || "—"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
              <span className="text-[var(--muted-foreground)]">Filial:</span>
              <span className="font-medium truncate">{group?.branchName || "—"}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="h-4 w-4 text-[var(--muted-foreground)] shrink-0 mt-0.5" />
              <div>
                <span className="text-[var(--muted-foreground)]">Jadval:</span>
                {schedules.length === 0 ? (
                  <span className="font-medium ml-1">—</span>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {schedules.map((s) => (
                      <p key={s.id} className="font-medium">
                        {getDayShort(s.dayOfWeek)} — {s.startTime}–{s.endTime}{s.room ? ` (${s.room})` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {group?.startDate && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                <span className="text-[var(--muted-foreground)]">Boshlangan:</span>
                <span className="font-medium">{formatDate(group.startDate)}</span>
              </div>
            )}

            <div className="pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--muted-foreground)]">Sig'im</span>
                <span className="font-medium">{group?.currentCount ?? 0}/{group?.capacity ?? 0}</span>
              </div>
              <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${fillPct >= 90 ? "bg-red-400" : fillPct >= 70 ? "bg-amber-400" : "bg-green-500"}`}
                  style={{ width: `${Math.min(fillPct, 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>O'quvchilar ({students.length})</span>
                <Button size="sm" variant="outline" onClick={openAddStudent}>
                  <Users className="h-4 w-4" />Qo'shish
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--muted)]/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/students/${s.id}`)}>
                    <span className="text-xs text-[var(--muted-foreground)] w-5 shrink-0">{i + 1}</span>
                    <UserAvatar name={s.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.fullName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Qo'shilgan: {formatDate(s.joinedAt)}</p>
                    </div>
                    <Badge variant="success" className="text-xs">{getStatusLabel(s.status)}</Badge>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="py-12 text-center text-[var(--muted-foreground)] text-sm">
                    O'quvchilar yo'q
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} size="sm">
        {created ? (
          <>
            <ModalHeader><ModalTitle>O'quvchi yaratildi</ModalTitle></ModalHeader>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold">{studentForm.fullName} guruhga qo'shildi</p>
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
              <Button type="button" variant="outline" size="sm" onClick={copyCredentials}>
                <Copy className="h-4 w-4" />Nusxalash
              </Button>
              <p className="text-xs text-[var(--muted-foreground)]">
                Bu ID va parolni o'quvchiga bering — bu ma'lumotlar boshqa hech qayerda ko'rsatilmaydi.
              </p>
            </div>
            <ModalFooter>
              <Button onClick={() => setAddOpen(false)}>Yopish</Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader><ModalTitle>Yangi o'quvchi qo'shish</ModalTitle></ModalHeader>
            <div className="p-6 space-y-3">
              <Input
                label="To'liq ismi *"
                placeholder="Ism Familya Otasining ismi"
                value={studentForm.fullName}
                onChange={(e) => setStudentForm((f) => ({ ...f, fullName: e.target.value }))}
              />
              <Input
                label="Telefon raqam *"
                placeholder="+998 90 123 45 67"
                value={studentForm.phone}
                onChange={(e) => setStudentForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))}
              />
              <Input
                label="Ota-ona telefoni"
                placeholder="+998 90 123 45 67"
                value={studentForm.parentPhone}
                onChange={(e) => setStudentForm((f) => ({ ...f, parentPhone: formatPhoneInput(e.target.value) }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tug'ilgan sana"
                  type="date"
                  value={studentForm.dob}
                  onChange={(e) => setStudentForm((f) => ({ ...f, dob: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Jinsi</label>
                  <Select value={studentForm.gender} onValueChange={(v) => setStudentForm((f) => ({ ...f, gender: v as "MALE" | "FEMALE" }))}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Erkak</SelectItem>
                      <SelectItem value="FEMALE">Ayol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">O'quvchi shu "{group?.name}" guruhiga avtomatik qo'shiladi.</p>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Bekor</Button>
              <Button onClick={handleCreateStudent} loading={createStudentMutation.isPending}>Saqlash</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}