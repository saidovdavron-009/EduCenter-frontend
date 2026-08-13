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
  return `${new Intl.NumberFormat("uz-UZ").format(amount)} ${currency}`;
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

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
