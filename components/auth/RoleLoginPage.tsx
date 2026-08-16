"use client";
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { AuthUser, UserRole } from "@/types";

const loginSchema = z.object({
  login: z.string().min(3, "ID raqamingizni kiriting"),
  password: z.string().min(4, "Parol kamida 4 ta belgi"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function getRedirectFromRole(role: UserRole) {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "TEACHER": return "/teacher/dashboard";
    case "STUDENT": return "/student/dashboard";
    case "PARENT":  return "/parent/dashboard";
  }
}

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "ID yoki parol noto'g'ri";
}

interface RoleLoginFormProps {
  allowedRoles: UserRole[];
}

function RoleLoginForm({ allowedRoles }: RoleLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, hydrateProfile, logout } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Eski/yaroqsiz sessiya qoldiqlari (masalan avvalgi test tokenlari) yangi
  // kirishga xalaqit bermasligi uchun login sahifasi ochilganda tozalanadi.
  React.useEffect(() => {
    logout();

    // Agar oldingi sahifada 401 sabab avtomatik logout+redirect bo'lgan bo'lsa,
    // sababi shu yerda ko'rsatiladi (redirect sahifani reload qilgani uchun
    // konsol tozalanib ketadi — shuning uchun bu yerda saqlab qo'yamiz).
    const lastError = sessionStorage.getItem("lastAuthError");
    if (lastError) {
      console.error("[auth] Oxirgi avtomatik chiqish sababi:", JSON.parse(lastError));
      toast.error("Sessiya tugadi: " + lastError, { duration: 15000 });
      sessionStorage.removeItem("lastAuthError");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (formData: LoginFormData) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(formData.login, formData.password);
      const { user } = data;

      if (!allowedRoles.includes(user.role)) {
        // Login/parol to'g'ri, lekin bu hisob shu portalga tegishli emas — backend
        // hali ham cookie o'rnatib ulgurgan, shuni bekor qilamiz va oddiy "login
        // yoki parol xato" xabarini ko'rsatamiz, aks holda bu portal orqali boshqa
        // portallardagi hisoblar mavjudligini bilib olish mumkin bo'lardi.
        await authApi.logout().catch(() => {});
        toast.error("ID yoki parol noto'g'ri");
        return;
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        loginId: user.loginId,
        role: user.role,
        isActive: true,
        isSuperAdmin: user.isSuperAdmin,
        avatarUrl: user.avatarUrl,
      };
      setAuth(authUser);

      try {
        const { data: profile } = await authApi.getProfile();
        hydrateProfile(profile);
      } catch {
        // Profile fetch is best-effort; login already succeeded.
      }

      toast.success("Xush kelibsiz!");
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl || getRedirectFromRole(user.role));
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Login ID field */}
      <div>
        <div className={`flex items-center border rounded-xl px-4 h-12 bg-white transition-colors ${errors.login ? "border-red-400" : "border-gray-200 focus-within:border-[#1E3A5F]"}`}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="ID raqami"
            autoComplete="username"
            className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder:text-gray-400"
            {...register("login")}
          />
        </div>
        {errors.login && <p className="text-xs text-red-500 mt-1 pl-1">{errors.login.message}</p>}
      </div>

      {/* Password field */}
      <div>
        <div className={`flex items-center border rounded-xl px-4 h-12 bg-white transition-colors ${errors.password ? "border-red-400" : "border-gray-200 focus-within:border-[#1E3A5F]"}`}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Parol"
            autoComplete="current-password"
            className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder:text-gray-400"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1 pl-1">{errors.password.message}</p>}
      </div>

      <div className="flex justify-end">
        <button type="button" className="text-xs text-gray-400 hover:text-[#1E3A5F] transition-colors">
          Parolni unutdingizmi?
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Tekshirilmoqda...
          </span>
        ) : "Kirish"}
      </button>
    </form>
  );
}

interface RoleLoginPageProps {
  allowedRoles: UserRole[];
  subtitle: string;
}

export function RoleLoginPage({ allowedRoles, subtitle }: RoleLoginPageProps) {
  return (
    <div className="min-h-[100dvh] flex bg-[#f0f2f5]">
      {/* Left panel — illustration */}
      <div className="hidden lg:flex flex-1 bg-[#1E3A5F] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-[-40px] w-32 h-32 rounded-full bg-white/5" />
        </div>

        {/* SVG Illustration */}
        <div className="relative z-10 w-full max-w-sm">
          <svg viewBox="0 0 400 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
            {/* Book / education base */}
            <rect x="60" y="200" width="280" height="20" rx="10" fill="#ffffff" fillOpacity="0.15"/>
            {/* Open book */}
            <path d="M120 100 Q200 80 280 100 L290 200 Q200 185 110 200 Z" fill="#ffffff" fillOpacity="0.12"/>
            <path d="M120 100 Q200 85 280 100" stroke="white" strokeWidth="2" strokeOpacity="0.4"/>
            <line x1="200" y1="85" x2="200" y2="200" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            {/* Lines on pages */}
            <line x1="130" y1="125" x2="190" y2="120" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            <line x1="130" y1="140" x2="190" y2="136" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            <line x1="130" y1="155" x2="190" y2="152" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            <line x1="210" y1="120" x2="270" y2="125" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            <line x1="210" y1="136" x2="270" y2="140" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            <line x1="210" y1="152" x2="270" y2="155" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
            {/* Graduation cap */}
            <ellipse cx="200" cy="52" rx="50" ry="8" fill="white" fillOpacity="0.25"/>
            <polygon points="200,20 250,52 200,60 150,52" fill="white" fillOpacity="0.35"/>
            <line x1="250" y1="52" x2="255" y2="75" stroke="white" strokeWidth="2" strokeOpacity="0.5"/>
            <circle cx="256" cy="78" r="5" fill="#22c55e"/>
            {/* Stars / sparkles */}
            <circle cx="80" cy="80" r="4" fill="#22c55e" fillOpacity="0.8"/>
            <circle cx="320" cy="90" r="3" fill="#f59e0b" fillOpacity="0.8"/>
            <circle cx="95" cy="170" r="3" fill="#f59e0b" fillOpacity="0.8"/>
            <circle cx="310" cy="170" r="4" fill="#22c55e" fillOpacity="0.8"/>
            {/* Person avatar */}
            <circle cx="200" cy="240" r="28" fill="white" fillOpacity="0.15"/>
            <circle cx="200" cy="232" r="12" fill="white" fillOpacity="0.4"/>
            <path d="M175 268 Q200 255 225 268" stroke="white" strokeWidth="2" strokeOpacity="0.4" fill="none"/>
            {/* Connection dots */}
            <circle cx="130" cy="240" r="5" fill="#22c55e" fillOpacity="0.7"/>
            <circle cx="270" cy="240" r="5" fill="#22c55e" fillOpacity="0.7"/>
            <line x1="135" y1="240" x2="172" y2="240" stroke="white" strokeWidth="1" strokeDasharray="4" strokeOpacity="0.3"/>
            <line x1="228" y1="240" x2="265" y2="240" stroke="white" strokeWidth="1" strokeDasharray="4" strokeOpacity="0.3"/>
            {/* Bottom bar */}
            <rect x="100" y="300" width="200" height="8" rx="4" fill="white" fillOpacity="0.1"/>
            <rect x="100" y="300" width="140" height="8" rx="4" fill="#22c55e" fillOpacity="0.6"/>
          </svg>
        </div>

        <div className="relative z-10 text-center mt-6">
          <h2 className="text-2xl font-bold text-white">EduCenter Pro</h2>
          <p className="text-white/60 text-sm mt-2">O'quv markazi boshqaruv tizimi</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center font-bold text-white text-sm">
              EP
            </div>
            <div>
              <p className="font-bold text-[#1E3A5F] text-base leading-tight">EduCenter Pro</p>
              <p className="text-gray-400 text-xs">O'quv Markazi</p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Kirish</h1>
          <p className="text-sm text-gray-400 mb-8">{subtitle}</p>

          <Suspense fallback={<div className="space-y-4"><div className="h-12 animate-pulse bg-gray-100 rounded-xl"/><div className="h-12 animate-pulse bg-gray-100 rounded-xl"/><div className="h-12 animate-pulse bg-gray-100 rounded-xl"/></div>}>
            <RoleLoginForm allowedRoles={allowedRoles} />
          </Suspense>

          <p className="text-center text-xs text-gray-300 mt-8">
            © 2025 EduCenter Pro
          </p>
        </div>
      </div>
    </div>
  );
}
