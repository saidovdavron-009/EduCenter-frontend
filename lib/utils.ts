import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern = "dd.MM.yyyy") {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd.MM.yyyy HH:mm");
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number, currency = "so'm") {
  return `${new Intl.NumberFormat("en-US").format(amount)} ${currency}`;
}

// Comma-grouped, no currency suffix — for plain numeric fields (counts, quantities, etc).
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

// Live-formats a phone number as the user types, inserting the +998 country
// code and grouping spaces automatically — so nobody has to type them by hand.
export function formatPhoneInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";

  let digits = digitsOnly.startsWith("998") ? digitsOnly : `998${digitsOnly}`;
  digits = digits.slice(0, 12);

  const rest = digits.slice(3);
  let formatted = "+998";
  if (rest.length > 0) formatted += ` ${rest.slice(0, 2)}`;
  if (rest.length > 2) formatted += ` ${rest.slice(2, 5)}`;
  if (rest.length > 5) formatted += ` ${rest.slice(5, 7)}`;
  if (rest.length > 7) formatted += ` ${rest.slice(7, 9)}`;
  return formatted;
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    FROZEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    GRADUATED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    FULL: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    CLOSED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PRESENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    ABSENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    LATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    EXCUSED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Aktiv",
    FROZEN: "Muzlatilgan",
    GRADUATED: "Tugatgan",
    FULL: "To'lgan",
    CLOSED: "Yopilgan",
    PAID: "To'langan",
    PENDING: "Kutilmoqda",
    OVERDUE: "Muddati o'tgan",
    PRESENT: "Keldi",
    ABSENT: "Kelmadi",
    LATE: "Kech qoldi",
    EXCUSED: "Sababli",
    ADMIN: "Administrator",
    TEACHER: "O'qituvchi",
    STUDENT: "O'quvchi",
    PARENT: "Ota-ona",
    CASH: "Naqd",
    CARD: "Karta",
    CLICK: "Click",
    PAYME: "Payme",
    UZUM: "Uzum",
    HOMEWORK: "Uy vazifasi",
    CLASSWORK: "Sinfda ish",
    TEST: "Test",
    EXAM: "Imtihon",
    MON: "Dushanba",
    TUE: "Seshanba",
    WED: "Chorshanba",
    THU: "Payshanba",
    FRI: "Juma",
    SAT: "Shanba",
    SUN: "Yakshanba",
  };
  return map[status] || status;
}

export function getDayShort(day: string): string {
  const map: Record<string, string> = {
    MON: "Du",
    TUE: "Se",
    WED: "Ch",
    THU: "Pa",
    FRI: "Ju",
    SAT: "Sh",
    SUN: "Ya",
  };
  return map[day] || day;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Admin has its own portal; teacher/student/parent all share the other one.
export function getLoginRoute(role?: string | null): string {
  return role === "ADMIN" ? "/admin/login" : "/student/login";
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
