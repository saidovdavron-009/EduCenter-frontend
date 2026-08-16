"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Lock, Eye, EyeOff, LogOut, Users, BookMarked, ClipboardCheck, Camera } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parentsApi, authApi, gradesApi, attendanceApi, uploadsApi } from "@/lib/api";
import { formatPhone, formatPhoneInput } from "@/lib/utils";
import toast from "react-hot-toast";

interface ParentDetail {
  fullName: string; phone: string; loginId: string | null;
  students: { id: string; fullName: string; status: string }[];
}
interface GradeRow { score: number; maxScore: number; }
interface AttendanceReportRow { percentage: number; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

function ChildStatCard({ studentId }: { studentId: string }) {
  const { data: grades = [] } = useQuery({
    queryKey: ["child-grades-stat", studentId],
    queryFn: () => gradesApi.getAll({ studentId, limit: 100 }).then((r) => (r.data as { data: GradeRow[] }).data),
  });
  const { data: attPct } = useQuery({
    queryKey: ["child-attendance-stat", studentId],
    queryFn: () => attendanceApi.getReport({ studentId }).then((r) => (r.data as AttendanceReportRow[])[0]?.percentage ?? null),
  });
  const avg = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length) : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="text-center p-3 bg-[var(--muted)] rounded-xl">
        <p className="text-lg font-bold text-green-600">{attPct != null ? `${attPct}%` : "—"}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center justify-center gap-1">
          <ClipboardCheck className="h-3 w-3" />Davomat
        </p>
      </div>
      <div className="text-center p-3 bg-[var(--muted)] rounded-xl">
        <p className="text-lg font-bold text-purple-600">{avg != null ? `${avg}%` : "—"}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center justify-center gap-1">
          <BookMarked className="h-3 w-3" />O'rtacha ball
        </p>
      </div>
    </div>
  );
}

export default function ParentProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  const parentId = user?.profile?.id;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) { toast.error("Faqat JPEG, JPG yoki PNG formatlar"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Fayl hajmi 2MB dan oshmasin"); return; }
    setUploading(true);
    try {
      const { data } = await uploadsApi.uploadAvatar(file);
      await authApi.updateAvatar(data.url);
      if (user) setUser({ ...user, avatarUrl: data.url });
      toast.success("Rasm yuklandi");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const { data: parent } = useQuery({
    queryKey: ["my-parent-full-profile", parentId],
    queryFn: () => parentsApi.getById(parentId as string).then((r) => r.data as ParentDetail),
    enabled: !!parentId,
  });

  const [form, setForm] = React.useState({ fullName: "", phone: "" });
  React.useEffect(() => {
    if (parent) setForm({ fullName: parent.fullName, phone: parent.phone });
  }, [parent]);

  const [showOld, setShowOld] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [passwords, setPasswords] = React.useState({ old: "", new: "", confirm: "" });

  const updateMutation = useMutation({
    mutationFn: () => parentsApi.update(parentId as string, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-parent-full-profile", parentId] });
      toast.success("Profil saqlandi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: passwords.old, newPassword: passwords.new }),
    onSuccess: () => {
      toast.success("Parol o'zgartirildi");
      setPasswords({ old: "", new: "", confirm: "" });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleChangePassword = () => {
    if (!passwords.old) { toast.error("Joriy parolni kiriting"); return; }
    if (passwords.new.length < 8) { toast.error("Yangi parol kamida 8 ta belgi"); return; }
    if (passwords.new !== passwords.confirm) { toast.error("Parollar mos kelmadi"); return; }
    changePasswordMutation.mutate();
  };

  const children = parent?.students ?? [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Mening profilim</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Shaxsiy ma'lumotlaringizni boshqaring</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleAvatarChange} />
            <div className="relative shrink-0">
              <UserAvatar name={form.fullName || "Ota-ona"} avatarUrl={user?.avatarUrl ?? undefined} size="xl" className="ring-4 ring-[#1E3A5F]/10" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center shadow-lg hover:bg-[#162d4a] transition-colors disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">{form.fullName || "—"}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  <Users className="h-3 w-3" />
                  Ota-ona
                </span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">ID: {parent?.loginId ?? user?.loginId ?? "—"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{form.phone ? formatPhone(form.phone) : ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {children.map((c) => (
        <Card key={c.id} className="border-[#1E3A5F]/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1E3A5F]" />
              Farzandim ma'lumotlari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <UserAvatar name={c.fullName} size="lg" />
              <div>
                <p className="font-bold text-base">{c.fullName}</p>
              </div>
            </div>
            <ChildStatCard studentId={c.id} />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Shaxsiy ma'lumotlar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">To'liq ism</label>
              <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>Saqlash</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Parolni o'zgartirish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Joriy parol", key: "old" as const, show: showOld, toggle: () => setShowOld((v) => !v) },
              { label: "Yangi parol", key: "new" as const, show: showNew, toggle: () => setShowNew((v) => !v) },
              { label: "Tasdiqlash", key: "confirm" as const, show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
            ].map(({ label, key, show, toggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1.5">{label}</label>
                <div className="relative">
                  <input type={show ? "text" : "password"} value={passwords[key]}
                    onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3 pr-9 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} loading={changePasswordMutation.isPending} variant="outline">
              <Lock className="h-4 w-4" />Parolni o'zgartirish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-red-600">Tizimdan chiqish</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => { logout(); router.push("/student/login"); }}>
            <LogOut className="h-4 w-4" />Chiqish
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
