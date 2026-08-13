import axios, { AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Backend wraps every success response as { success, data, timestamp } (see ResponseInterceptor).
// Unwrap it here so callers work with the actual payload directly.
function unwrapEnvelope(response: AxiosResponse): AxiosResponse {
  const body = response.data as { success?: boolean; data?: unknown } | null;
  if (body && typeof body === "object" && body.success === true && "data" in body) {
    response.data = body.data;
  }
  return response;
}

export function setAccessTokenCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `accessToken=${token}; path=/`;
  }
}

export function clearAccessTokenCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "accessToken=; path=/; max-age=0";
  }
}

// Refresh tokens rotate server-side on every use (single-use). Dashboard pages fire
// several requests in parallel, so multiple 401s can land at once — without this,
// each one would race to redeem the same refreshToken and all but the first would
// fail, logging the user out even though the first refresh actually succeeded.
// Sharing one in-flight refresh call across all of them avoids that race.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const { data: envelope } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = envelope.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setAccessTokenCookie(accessToken);
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function recordAuthFailure(originalError: unknown, refreshError: unknown) {
  if (typeof window === "undefined") return;
  const describe = (e: unknown) => {
    const ax = e as { config?: { url?: string; method?: string }; response?: { status?: number; data?: unknown }; message?: string };
    return {
      url: ax?.config?.url,
      method: ax?.config?.method,
      status: ax?.response?.status,
      data: ax?.response?.data,
      message: ax?.message,
    };
  };
  try {
    sessionStorage.setItem(
      "lastAuthError",
      JSON.stringify({
        at: new Date().toISOString(),
        failingRequest: describe(originalError),
        refreshAttempt: describe(refreshError),
      }, null, 2),
    );
  } catch {
    // sessionStorage unavailable — nothing to do, the redirect still proceeds.
  }
}

// These endpoints are public (no session to refresh) — a 401 from them means
// "wrong credentials" or "bad/expired OTP", not "your session expired". They must
// bubble up as a normal rejected promise so the calling form can show its own error,
// instead of being treated as a session-expiry that force-redirects to /login.
const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
];

api.interceptors.response.use(
  (response) => unwrapEnvelope(response),
  async (error) => {
    const originalRequest = error.config;
    const isExcluded = AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((p) => originalRequest?.url?.includes(p));

    if (error.response?.status === 401 && !originalRequest._retry && !isExcluded) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        recordAuthFailure(error, refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        clearAccessTokenCookie();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (login: string, password: string) =>
    api.post("/auth/login", { login, password }),
  logout: () => api.post("/auth/logout"),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
  getProfile: () => api.get("/auth/profile"),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.patch("/auth/change-password", data),
  updateAvatar: (avatarUrl: string) => api.patch("/auth/avatar", { avatarUrl }),
  updateProfile: (data: { fullName?: string; phone?: string; dob?: string; gender?: string }) =>
    api.patch("/auth/profile", data),
};

// File uploads
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export function resolveFileUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

export const uploadsApi = {
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Students
export const studentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/students", { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: unknown) => api.post("/students", data),
  update: (id: string, data: unknown) => api.patch(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  getAttendance: (id: string, params?: Record<string, unknown>) =>
    api.get("/attendance", { params: { ...params, studentId: id } }),
  getGrades: (id: string, params?: Record<string, unknown>) =>
    api.get("/grades", { params: { ...params, studentId: id } }),
  getPayments: (id: string) => api.get("/payments", { params: { studentId: id } }),
};

// Teachers
export const teachersApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/teachers", { params }),
  getById: (id: string) => api.get(`/teachers/${id}`),
  create: (data: unknown) => api.post("/teachers", data),
  update: (id: string, data: unknown) => api.patch(`/teachers/${id}`, data),
  delete: (id: string) => api.delete(`/teachers/${id}`),
  getGroups: (id: string) => api.get(`/teachers/${id}/groups`),
};

// Groups
export const groupsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/groups", { params }),
  getById: (id: string) => api.get(`/groups/${id}`),
  create: (data: unknown) => api.post("/groups", data),
  update: (id: string, data: unknown) => api.patch(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addStudent: (groupId: string, studentId: string) =>
    api.post(`/groups/${groupId}/students`, { studentId }),
  removeStudent: (groupId: string, studentId: string) =>
    api.delete(`/groups/${groupId}/students/${studentId}`),
};

// Subjects
export const subjectsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/subjects", { params }),
  create: (data: unknown) => api.post("/subjects", data),
  update: (id: string, data: unknown) => api.patch(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Parents
export const parentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/parents", { params }),
  getById: (id: string) => api.get(`/parents/${id}`),
  create: (data: unknown) => api.post("/parents", data),
  update: (id: string, data: unknown) => api.patch(`/parents/${id}`, data),
  delete: (id: string) => api.delete(`/parents/${id}`),
  linkStudent: (parentId: string, studentId: string) => api.post("/parents/link-student", { parentId, studentId }),
  unlinkStudent: (parentId: string, studentId: string) => api.delete("/parents/unlink-student", { data: { parentId, studentId } }),
};

// Schedules
export const schedulesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/schedules", { params }),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: unknown) => api.post("/schedules", data),
  update: (id: string, data: unknown) => api.patch(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  getWeekly: (params?: Record<string, unknown>) => api.get("/schedules/weekly", { params }),
};

// Attendance
export const attendanceApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/attendance", { params }),
  mark: (data: unknown) => api.post("/attendance", data),
  markBulk: (data: unknown) => api.post("/attendance/bulk", data),
  update: (id: string, data: unknown) => api.patch(`/attendance/${id}`, data),
  getReport: (params?: Record<string, unknown>) => api.get("/attendance/report", { params }),
  getMonthly: (params?: Record<string, unknown>) => api.get("/attendance/monthly", { params }),
};

// Payments
export const paymentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/payments", { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: unknown) => api.post("/payments", data),
  update: (id: string, data: unknown) => api.patch(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
  getDashboard: () => api.get("/payments/dashboard"),
  getReport: (params?: Record<string, unknown>) => api.get("/payments/report", { params }),
};

// Grades
export const gradesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/grades", { params }),
  create: (data: unknown) => api.post("/grades", data),
  update: (id: string, data: unknown) => api.patch(`/grades/${id}`, data),
  delete: (id: string) => api.delete(`/grades/${id}`),
  getByGroup: (groupId: string, params?: Record<string, unknown>) =>
    api.get(`/grades/group/${groupId}`, { params }),
};

// Notifications
export const notificationsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  send: (data: unknown) => api.post("/notifications/send", data),
  sendBulk: (data: unknown) => api.post("/notifications/send-bulk", data),
};

// Homework
export const homeworkApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/homework", { params }),
  getById: (id: string) => api.get(`/homework/${id}`),
  create: (data: unknown) => api.post("/homework", data),
  update: (id: string, data: unknown) => api.patch(`/homework/${id}`, data),
  delete: (id: string) => api.delete(`/homework/${id}`),
  submit: (id: string, data: unknown) => api.post(`/homework/${id}/submit`, data),
  grade: (id: string, submissionId: string, data: unknown) =>
    api.patch(`/homework/${id}/submissions/${submissionId}`, data),
};

// Materials
export const materialsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/materials", { params }),
  create: (data: unknown) => api.post("/materials", data),
  update: (id: string, data: unknown) => api.patch(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Contracts
export const contractsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/contracts", { params }),
  getById: (id: string) => api.get(`/contracts/${id}`),
  create: (data: unknown) => api.post("/contracts", data),
  update: (id: string, data: unknown) => api.patch(`/contracts/${id}`, data),
  delete: (id: string) => api.delete(`/contracts/${id}`),
};

// Discounts
export const discountsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/discounts", { params }),
  getById: (id: string) => api.get(`/discounts/${id}`),
  create: (data: unknown) => api.post("/discounts", data),
  update: (id: string, data: unknown) => api.patch(`/discounts/${id}`, data),
  delete: (id: string) => api.delete(`/discounts/${id}`),
};

// Branches
export const branchesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/branches", { params }),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (data: unknown) => api.post("/branches", data),
  update: (id: string, data: unknown) => api.patch(`/branches/${id}`, data),
  delete: (id: string) => api.delete(`/branches/${id}`),
};

// Rooms
export const roomsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/rooms", { params }),
  getById: (id: string) => api.get(`/rooms/${id}`),
  create: (data: unknown) => api.post("/rooms", data),
  update: (id: string, data: unknown) => api.patch(`/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
};

// Tasks
export const tasksApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/tasks", { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post("/tasks", data),
  update: (id: string, data: unknown) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Teacher Attendance
export const teacherAttendanceApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/teacher-attendance", { params }),
  getById: (id: string) => api.get(`/teacher-attendance/${id}`),
  create: (data: unknown) => api.post("/teacher-attendance", data),
  update: (id: string, data: unknown) => api.patch(`/teacher-attendance/${id}`, data),
  delete: (id: string) => api.delete(`/teacher-attendance/${id}`),
};

// Teacher Salaries
export const teacherSalariesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/teacher-salaries", { params }),
  getById: (id: string) => api.get(`/teacher-salaries/${id}`),
  create: (data: unknown) => api.post("/teacher-salaries", data),
  update: (id: string, data: unknown) => api.patch(`/teacher-salaries/${id}`, data),
  pay: (id: string, data?: unknown) => api.patch(`/teacher-salaries/${id}/pay`, data),
  delete: (id: string) => api.delete(`/teacher-salaries/${id}`),
};

// Settings
export const settingsApi = {
  getAllSettings: () => api.get("/settings/app-settings"),
  getPublicSettings: () => api.get("/settings/public"),
  upsertSetting: (data: unknown) => api.post("/settings/app-settings", data),
  getHolidays: (params?: Record<string, unknown>) => api.get("/settings/holidays", { params }),
  createHoliday: (data: unknown) => api.post("/settings/holidays", data),
  updateHoliday: (id: string, data: unknown) => api.patch(`/settings/holidays/${id}`, data),
  deleteHoliday: (id: string) => api.delete(`/settings/holidays/${id}`),
  getAuditLogs: (params?: Record<string, unknown>) => api.get("/settings/audit-logs", { params }),
  getSmsLogs: (params?: Record<string, unknown>) => api.get("/settings/sms-logs", { params }),
};

// Inventory
export const inventoryApi = {
  getAllItems: (params?: Record<string, unknown>) => api.get("/inventory/items", { params }),
  getItemById: (id: string) => api.get(`/inventory/items/${id}`),
  createItem: (data: unknown) => api.post("/inventory/items", data),
  updateItem: (id: string, data: unknown) => api.patch(`/inventory/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/inventory/items/${id}`),
  stockIn: (data: unknown) => api.post("/inventory/stock-in", data),
  stockOut: (data: unknown) => api.post("/inventory/stock-out", data),
  sell: (data: unknown) => api.post("/inventory/sell", data),
};

// Leads (CRM)
export const leadsApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/leads", { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  create: (data: unknown) => api.post("/leads", data),
  update: (id: string, data: unknown) => api.patch(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  convert: (id: string, data: unknown) => api.patch(`/leads/${id}/convert`, data),
  addCallLog: (id: string, data: unknown) => api.post(`/leads/${id}/call-log`, data),
  getSources: () => api.get("/leads/sources"),
  createSource: (data: unknown) => api.post("/leads/sources", data),
};

// Reports / Analytics
export const reportsApi = {
  getDashboardStats: () => api.get("/reports/dashboard"),
  getRevenue: (params?: Record<string, unknown>) => api.get("/reports/revenue", { params }),
  getAttendanceReport: (params?: Record<string, unknown>) =>
    api.get("/reports/attendance", { params }),
  getStudentReport: (params?: Record<string, unknown>) =>
    api.get("/reports/students", { params }),
  getTeacherReport: (params?: Record<string, unknown>) =>
    api.get("/reports/teachers", { params }),
};

// Quizzes
export const quizzesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/quizzes", { params }),
  getById: (id: string) => api.get(`/quizzes/${id}`),
  create: (data: unknown) => api.post("/quizzes", data),
  update: (id: string, data: unknown) => api.patch(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  publish: (id: string) => api.patch(`/quizzes/${id}/publish`),
  addQuestion: (id: string, data: unknown) => api.post(`/quizzes/${id}/questions`, data),
  updateQuestion: (id: string, questionId: string, data: unknown) => api.patch(`/quizzes/${id}/questions/${questionId}`, data),
  deleteQuestion: (id: string, questionId: string) => api.delete(`/quizzes/${id}/questions/${questionId}`),
  getResults: (id: string, params?: Record<string, unknown>) => api.get(`/quizzes/${id}/results`, { params }),
};

// Expenses
export const expensesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/expenses", { params }),
  create: (data: unknown) => api.post("/expenses", data),
  update: (id: string, data: unknown) => api.patch(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};
