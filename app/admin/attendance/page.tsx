"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, AlertCircle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { attendanceApi, groupsApi, schedulesApi } from "@/lib/api";
import type { AttendanceStatus, DayOfWeek } from "@/types";
import toast from "react-hot-toast";

interface GroupOption { id: string; name: string; }
interface GroupStudent { id: string; fullName: string; phone: string; avatarUrl: string | null; status: string; }
interface ScheduleOption { id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }
interface AttendanceRecord { studentId: string; status: AttendanceStatus }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const DOW_BY_JS_DAY: DayOfWeek[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const EMPTY_STUDENTS: GroupStudent[] = [];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = React.useState<Record<string, AttendanceStatus>>({});

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
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

  const present = Object.values(attendanceMap).filter((s) => s === "PRESENT").length;
  const absent = Object.values(attendanceMap).filter((s) => s === "ABSENT").length;
  const late = Object.values(attendanceMap).filter((s) => s === "LATE").length;
  const excused = Object.values(attendanceMap).filter((s) => s === "EXCUSED").length;
  const total = Object.keys(attendanceMap).length;

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

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const StatusButton = ({ studentId, status }: { studentId: string; status: AttendanceStatus }) => {
    const current = attendanceMap[studentId];
    const configs: Record<AttendanceStatus, { icon: React.ReactNode; label: string; active: string; inactive: string }> = {
      PRESENT: { icon: <CheckCircle className="h-4 w-4" />, label: "Keldi", active: "bg-green-600 text-white", inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
      ABSENT: { icon: <XCircle className="h-4 w-4" />, label: "Kelmadi", active: "bg-red-500 text-white", inactive: "bg-red-50 text-red-700 hover:bg-red-100" },
      LATE: { icon: <Clock className="h-4 w-4" />, label: "Kech", active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
      EXCUSED: { icon: <AlertCircle className="h-4 w-4" />, label: "Sababli", active: "bg-blue-600 text-white", inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
    };
    const config = configs[status];
    return (
      <button
        onClick={() => handleStatusChange(studentId, status)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${current === status ? config.active : config.inactive}`}
      >
        {config.icon}
        {config.label}
      </button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Davomat</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Davomat belgilash va hisobotlar</p>
        </div>
        <Button onClick={handleSave} loading={saveMutation.isPending} disabled={!todaySchedule}>
          <ClipboardCheck className="h-4 w-4" />
          Saqlash
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        />
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Guruh tanlang" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedGroup && !todaySchedule && (
        <p className="text-sm text-amber-600">Tanlangan guruhda bu kunda ({formatDate(selectedDate)}) dars mavjud emas.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard title="Keldi" value={`${present}/${total}`} icon={<CheckCircle className="h-5 w-5" />} iconBg="bg-green-100" />
        <StatCard title="Kelmadi" value={absent} icon={<XCircle className="h-5 w-5" />} iconBg="bg-red-100" />
        <StatCard title="Kech qoldi" value={late} icon={<Clock className="h-5 w-5" />} iconBg="bg-amber-100" />
        <StatCard title="Sababli" value={excused} icon={<AlertCircle className="h-5 w-5" />} iconBg="bg-blue-100" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Davomat — {formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedGroup ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">Guruhni tanlang</p>
          ) : students.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">Guruhda o'quvchilar yo'q</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O'quvchi</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={s.fullName} size="sm" />
                        <span className="font-medium text-sm">{s.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s2) => (
                          <StatusButton key={s2} studentId={s.id} status={s2} />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}