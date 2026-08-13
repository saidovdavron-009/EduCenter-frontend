"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X, Check, Eye, EyeOff, LogOut, Upload } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "@/components/ui/avatar";
import { uploadsApi, authApi, settingsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

interface AdminProfile {
  email: string | null;
  loginId: string | null;
  fullName: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
}

interface InfoCardProps {
  title: string;
  value: string;
  onEdit?: () => void;
  masked?: boolean;
}
function InfoCard({ title, value, onEdit, masked }: InfoCardProps) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <div className="flex items-center gap-1">
          {masked && value && (
            <button onClick={() => setShow(v => !v)} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm font-mono text-[var(--foreground)]">
        {masked ? (show ? (value || "—") : "••••••••") : value}
      </p>
    </div>
  );
}

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();

  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Faqat JPEG, JPG yoki PNG formatlar"); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fayl hajmi 2MB dan oshmasin"); return;
    }
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

  const { data: profile } = useQuery({
    queryKey: ["my-admin-profile"],
    queryFn: () => authApi.getProfile().then((r) => r.data as AdminProfile),
  });

  const { data: settingsRes } = useQuery({
    queryKey: ["app-settings-center-name"],
    queryFn: () => settingsApi.getAllSettings().then((r) => r.data as { data: { key: string; value: string | null }[] }),
  });
  const centerName = settingsRes?.data.find((s) => s.key === "center_name")?.value || "—";

  const [editField, setEditField] = React.useState<string | null>(null);
  const [editVal, setEditVal] = React.useState("");
  const [showPassModal, setShowPassModal] = React.useState(false);
  const [passwords, setPasswords] = React.useState({ old: "", new: "", confirm: "" });
  const [showPw, setShowPw] = React.useState({ old: false, new: false, confirm: false });

  const fieldLabels: Record<string, string> = {
    firstName: "Ism", lastName: "Familiya", phone: "Telefon raqam",
    dob: "Tug'ilgan sana", gender: "Jinsi", email: "Email",
  };

  const info = profile ? {
    firstName: profile.fullName?.split(" ")[0] || "",
    lastName: profile.fullName?.split(" ").slice(1).join(" ") || "",
    phone: profile.phone || "",
    dob: profile.dob ? profile.dob.slice(0, 10) : "",
    gender: profile.gender === "MALE" ? "Erkak" : profile.gender === "FEMALE" ? "Ayol" : "",
    email: profile.email || "",
  } : null;

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-admin-profile"] });
      toast.success("Saqlandi");
      setEditField(null);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const startEdit = (field: string) => {
    if (field === "email") return;
    setEditField(field);
    setEditVal(info ? String(info[field as keyof typeof info] ?? "") : "");
  };

  const saveEdit = () => {
    if (!editField) return;
    if (editField === "firstName" || editField === "lastName") {
      const firstName = editField === "firstName" ? editVal : info?.firstName || "";
      const lastName = editField === "lastName" ? editVal : info?.lastName || "";
      updateMutation.mutate({ fullName: [firstName, lastName].filter(Boolean).join(" ") });
      return;
    }
    if (editField === "gender") {
      updateMutation.mutate({ gender: editVal === "Erkak" ? "MALE" : editVal === "Ayol" ? "FEMALE" : undefined });
      return;
    }
    if (editField === "dob") {
      updateMutation.mutate({ dob: editVal || undefined });
      return;
    }
    updateMutation.mutate({ [editField]: editVal });
  };

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: passwords.old, newPassword: passwords.new }),
    onSuccess: () => {
      toast.success("Parol o'zgartirildi");
      setPasswords({ old: "", new: "", confirm: "" });
      setShowPassModal(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleChangePassword = () => {
    if (!passwords.old) { toast.error("Joriy parolni kiriting"); return; }
    if (passwords.new.length < 6) { toast.error("Yangi parol kamida 6 ta belgi"); return; }
    if (passwords.new !== passwords.confirm) { toast.error("Parollar mos kelmadi"); return; }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl">
      {/* Personal info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
        <h2 className="text-base font-bold mb-4 sm:mb-5">Shaxsiy ma'lumotlar</h2>

        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
          {/* Photo */}
          <div className="flex items-start gap-4 shrink-0">
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center bg-[var(--muted)] hover:border-[#1E3A5F] hover:bg-[#1E3A5F]/5 transition-colors overflow-hidden relative group"
              >
                <svg viewBox="0 0 96 96" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <rect width="96" height="96" fill="#e5e7eb" />
                  <circle cx="48" cy="36" r="18" fill="#9ca3af" />
                  <ellipse cx="48" cy="82" rx="28" ry="20" fill="#9ca3af" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-5 w-5 text-white" />
                  <p className="text-[9px] text-white mt-0.5 font-medium">Yuklash</p>
                </div>
              </button>
              <p className="text-[9px] text-[var(--muted-foreground)] text-center max-w-[80px] leading-tight">
                500x500 JPEG, JPG, PNG maks 2MB
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden border border-[var(--border)] relative">
                <UserAvatar name={profile?.fullName || "Admin"} avatarUrl={user?.avatarUrl ?? undefined} size="xl" className="w-full h-full rounded-xl" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[10px] text-[#1E3A5F] hover:underline font-medium disabled:opacity-50"
              >
                {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
              </button>
            </div>
          </div>

          {/* Info grid */}
          {info && (
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
              {(Object.keys(info) as Array<keyof typeof info>).map(field => (
                <div key={field} className="min-w-0">
                  <p className="text-xs text-[var(--muted-foreground)] mb-0.5">{fieldLabels[field]}</p>
                  {editField === field ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        autoFocus
                        type={field === "dob" ? "date" : "text"}
                        className="flex-1 min-w-0 h-7 px-2 text-sm border border-[#1E3A5F] rounded-lg outline-none bg-[var(--background)]"
                      />
                      <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditField(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <p className="text-sm font-semibold truncate">{(field === "dob" && info[field]) ? formatDate(info[field]) : (info[field] || "—")}</p>
                      {field !== "email" && (
                        <button onClick={() => startEdit(field)} className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted-foreground)] hover:text-[#1E3A5F] transition-all">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="min-w-0">
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">O'quv markaz</p>
                <p className="text-sm font-semibold truncate">{centerName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credential cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard title="Kirish (Login)" value={profile?.loginId || "—"} />
        <InfoCard title="Parol" value="" masked onEdit={() => setShowPassModal(true)} />
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold">Bildirishnomalar</p>
          <p className="text-sm text-[var(--muted-foreground)]">SMS va email orqali</p>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tizimdan chiqish</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Hisobingizdan chiqish</p>
        </div>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />Chiqish
        </button>
      </div>

      {/* Password modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--card)] rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base">Parolni o'zgartirish</h3>
              <button onClick={() => setShowPassModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--muted)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {(["old", "new", "confirm"] as const).map(k => (
                <div key={k}>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1">
                    {k === "old" ? "Joriy parol" : k === "new" ? "Yangi parol" : "Tasdiqlash"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw[k] ? "text" : "password"}
                      value={passwords[k]}
                      onChange={e => setPasswords(p => ({ ...p, [k]: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full h-10 pl-3 pr-9 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                    <button type="button" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                      {showPw[k] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowPassModal(false)}
                className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors">
                Bekor
              </button>
              <button onClick={handleChangePassword}
                className="flex-1 h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#162d4a] transition-colors">
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
