"use client";

import Link from "next/link";
import { GraduationCap, Home, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--primary)" }}
      />

      <div className="flex items-center gap-2 text-[var(--primary)]">
        <GraduationCap className="h-7 w-7" />
        <span className="text-sm font-semibold tracking-wide">EduCenter Pro</span>
      </div>

      <div className="relative mt-8 select-none">
        <h1 className="text-[7rem] font-extrabold leading-none tracking-tight text-[var(--primary)] sm:text-[9rem]">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg sm:h-20 sm:w-20">
            <SearchX className="h-8 w-8 text-[var(--muted-foreground)] sm:h-9 sm:w-9" />
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        Sahifa topilmadi
      </h2>
      <p className="mt-3 max-w-md text-center text-[var(--muted-foreground)]">
        Siz qidirayotgan sahifa mavjud emas, o&apos;chirilgan yoki manzil
        noto&apos;g&apos;ri kiritilgan bo&apos;lishi mumkin.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          <Home className="h-4 w-4" />
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}
