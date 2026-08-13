"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, groupsApi, schedulesApi } from "@/lib/api";
import type { AttendanceStatus, DayOfWeek } from "@/types";
import toast from "react-hot-toast";

interface GroupOption { id: string; name: string; }
interface GroupStudent { id: string; fullName: string; }
interface ScheduleOption { id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }
interface AttendanceRecord { studentId: string; status: AttendanceStatus }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const DOW_BY_JS_DAY: DayOfWeek[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const EMPTY_STUDENTS: GroupStudent[] = [];

const statusConfigs: { status: AttendanceStatus; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
  { status: "PRESENT", label: "Keldi", icon: <CheckCircle className="h-4 w-4" />, active: "bg-green-600 text-white", inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
  { status: "ABSENT", label: "Kelmadi", icon: <XCircle className="h-4 w-4" />, active: "bg-red-500 text-white", inactive: "bg-red-50 text-red-700 hover:bg-red-100" },
  { status: "LATE", label: "Kech", icon: <Clock className="h-4 w-4" />, active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { status: "EXCUSED", label: "Sababli", icon: <AlertCircle className="h-4 w-4" />, active: "bg-blue-600 text-white", inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
];

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const teacherId = user?.profile?.id;
  const [selectedGroup, setSelectedGroup] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = React.useState<Record<string, AttendanceStatus>>({});

  const { data: groupsRes } = useQuery({
    queryKey: ["my-groups-options", teacherId],
    queryFn: () => groupsApi.getAll({ teacherId, limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
    enabled: !!teacherId,
  });
  const groups = groupsRes?.data ?? [];

  const { data: students = EMPTY_STUDENTS } = useQuery({
    queryKey: ["group-students", selectedGroup],
    queryFn: () => groupsApi.getById(selectedGroup).then((r) => (r.data as { students: GroupStudent[] }).students),
    enabled: !!selectedGroup,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["group-schedules", selectedGroup],
    queryFn: () => schedulesApi.getAll({ groupId: selectedGroup }).then((r) => r.data as ScheduleOption[]),
    enabled: !!selectedGroup,
  });

  const dayOfWeek = DOW_BY_JS_DAY[new Date(selectedDate + "T00:00:00").getDay()];
  const todaySchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance", todaySchedule?.id, selectedDate],
    queryFn: () =>
      attendanceApi.getAll({ scheduleId: todaySchedule!.id, dateFrom: selectedDate, dateTo: selectedDate }).then(
        (r) => (r.data as { data: AttendanceRecord[] }).data
      ),
    enabled: !!todaySchedule,
  });

  React.useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const s of students) map[s.id] = "PRESENT";
    for (const a of existingAttendance ?? []) map[a.studentId] = a.status;
    setAttendanceMap(map);
  }, [students, existingAttendance]);

  const mark = (id: string, status: AttendanceStatus) => setAttendanceMap((prev) => ({ ...prev, [id]: status }));
  const allPresent = () => setAttendanceMap(Object.fromEntries(students.map((s) => [s.id, "PRESENT" as AttendanceStatus])));

  const presentCount = Object.values(attendanceMap).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(attendanceMap).filter((s) => s === "LATE").length;

  const saveMutation = useMutation({
    mutationFn: () =>
      attendanceApi.markBulk({
        scheduleId: todaySchedule!.id,
        date: selectedDate,
        attendances: students.map((s) => ({ studentId: s.id, status: attendanceMap[s.id] || "PRESENT" })),
      }),
    onSuccess: () => {
      toast.success("Davomat saqlandi");
      queryClient.invalidateQueries({ queryKey: ["attendance", todaySchedule?.id, selectedDate] });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSave = () => {
    if (!todaySchedule) { toast.error("Bu kunda dars mavjud emas"); return; }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Davomat belgilash</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{formatDate(selectedDate)}</p>
        </div>
        <Button onClick={handleSave} loading={saveMutation.isPending} disabled={!todaySchedule}><Save className="h-4 w-4" />Saqlash</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Guruh" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
        <Button variant="outline" size="sm" onClick={allPresent} disabled={!selectedGroup}>Barchasi keldi</Button>
      </div>

      {selectedGroup && !todaySchedule && (
        <p className="text-sm text-amber-600">Tanlangan guruhda bu kunda dars mavjud emas.</p>
      )}

      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">{presentCount} keldi</span>
        <span className="text-red-500">{absentCount} kelmadi</span>
        <span className="text-amber-600">{lateCount} kech</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {!selectedGroup ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">Guruhni tanlang</p>
          ) : students.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">Guruhda o'quvchilar yo'q</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {students.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-[var(--muted-foreground)] w-5">{idx + 1}</span>
                  <UserAvatar name={s.fullName} size="sm" />
                  <span className="flex-1 text-sm font-medium">{s.fullName}</span>
                  <div className="flex gap-1.5">
                    {statusConfigs.map(({ status, label, icon, active, inactive }) => (
                      <button key={status} onClick={() => mark(s.id, status)}
                        title={label}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${attendanceMap[s.id] === status ? active : inactive}`}>
                        {icon}
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}