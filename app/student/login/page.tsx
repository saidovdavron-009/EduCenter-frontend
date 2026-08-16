"use client";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function StudentLoginPage() {
  return <RoleLoginPage allowedRoles={["STUDENT", "TEACHER", "PARENT"]} subtitle="Tizimga kirish uchun ma'lumotlaringizni kiriting" />;
}
