"use client";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function AdminLoginPage() {
  return <RoleLoginPage allowedRoles={["ADMIN"]} subtitle="Administrator sifatida tizimga kirish" />;
}
