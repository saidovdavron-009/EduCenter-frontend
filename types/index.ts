export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export type StudentStatus = "ACTIVE" | "FROZEN" | "GRADUATED";
export type GroupStatus = "ACTIVE" | "FULL" | "CLOSED";
export type PaymentMethod = "CASH" | "CARD" | "CLICK" | "PAYME" | "UZUM";
export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type GradeType = "HOMEWORK" | "CLASSWORK" | "TEST" | "EXAM";
export type NotificationType = "SMS" | "TELEGRAM" | "EMAIL" | "IN_APP";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: Student | Teacher | Parent;
}

export interface Student {
  id: string;
  userId: string;
  fullName: string;
  dob?: string;
  gender?: "MALE" | "FEMALE";
  address?: string;
  phone: string;
  parentPhone?: string;
  email?: string;
  avatarUrl?: string;
  status: StudentStatus;
  groups: Group[];
  payments?: Payment[];
  attendances?: Attendance[];
  grades?: Grade[];
  referralSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  subjects: string[];
  experience?: number;
  salaryType: "HOURLY" | "MONTHLY";
  salary: number;
  avatarUrl?: string;
  groups?: Group[];
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  students?: Student[];
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  level?: string;
  groups?: Group[];
}

export interface Group {
  id: string;
  name: string;
  subjectId: string;
  subject?: Subject;
  teacherId: string;
  teacher?: Teacher;
  capacity: number;
  currentCount?: number;
  level?: string;
  monthlyFee: number;
  status: GroupStatus;
  schedules?: Schedule[];
  students?: Student[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  groupId: string;
  group?: Group;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  attendances?: Attendance[];
}

export interface Attendance {
  id: string;
  scheduleId: string;
  schedule?: Schedule;
  studentId: string;
  student?: Student;
  status: AttendanceStatus;
  date: string;
  note?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  student?: Student;
  groupId?: string;
  group?: Group;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  paidAt?: string;
  dueDate?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  student?: Student;
  teacherId: string;
  teacher?: Teacher;
  groupId?: string;
  type: GradeType;
  score: number;
  maxScore: number;
  comment?: string;
  date: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  studentId: string;
  student?: Student;
  fileUrl: string;
  signedAt?: string;
  status: ContractStatus;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: "RENT" | "SALARY" | "UTILITY" | "OTHER";
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
}

export interface HomeworkAssignment {
  id: string;
  groupId: string;
  group?: Group;
  teacherId: string;
  teacher?: Teacher;
  title: string;
  description?: string;
  dueDate: string;
  materials?: Material[];
  submissions?: HomeworkSubmission[];
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  student?: Student;
  fileUrl?: string;
  text?: string;
  grade?: number;
  feedback?: string;
  submittedAt: string;
}

export interface Material {
  id: string;
  groupId?: string;
  teacherId: string;
  title: string;
  type: "PDF" | "VIDEO" | "IMAGE" | "LINK";
  url: string;
  createdAt: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalGroups: number;
  monthlyRevenue: number;
  pendingPayments: number;
  todayAttendanceRate: number;
  totalAttendanceRate: number;
  recentActivities?: unknown[];
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AttendanceReport {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  loginId: string | null;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  profile?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
