"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { studentsApi, schedulesApi } from "@/lib/api";
import type { DayOfWeek } from "@/types";

interface StudentGroup { id: string; name: string; }
interface ScheduleEntry { id: string; groupId: string; groupName: string; teacherName: string | null; dayOfWeek: DayOfWeek; startTime: string; endTime: string; room: string | null; }

const DAY_KEYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const DAY_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh"];

const COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-amber-100 text-amber-800 border-amber-200",
];

const todayDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export default function StudentSchedulePage() {
  const { user } = useAuthStore();
  const studentId = user?.profile?.id;
  const [view, setView] = React.useState<"week" | "list">("week");

  const { data: student } = useQuery({
    queryKey: ["my-student-profile", studentId],
    queryFn: () => studentsApi.getById(studentId as string).then((r) => r.data as { groups: { id: string; name: string }[] }),
    enabled: !!studentId,
  });
  const myGroups: StudentGroup[] = student?.groups ?? [];
  const groupColor = React.useMemo(() => new Map(myGroups.map((g, i) => [g.id, COLORS[i % COLORS.length]])), [myGroups]);

  const { data: schedule = [] } = useQuery({
    queryKey: ["my-full-schedule", myGroups.map((g) => g.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(myGroups.map((g) => schedulesApi.getWeekly({ groupId: g.id }).then((r) => r.data as Record<string, ScheduleEntry[]>)));
      return results.flatMap((weekly) => Object.values(weekly).flat());
    },
    enabled: myGroups.length > 0,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dars jadvali</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Haftalik dars jadvalim</p>
        </div>
        <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-1">
          <button onClick={() => setView("week")} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === "week" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>
            Haftalik
          </button>
          <button onClick={() => setView("list")} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>
            Ro'yxat
          </button>
        </div>
      </div>

      {view === "week" ? (
        <div className="grid grid-cols-6 gap-2">
          {DAYS.map((day, idx) => {
            const dayLessons = schedule.filter((s) => s.dayOfWeek === DAY_KEYS[idx]);
            const isToday = idx === todayDayIndex;
            return (
              <div key={idx} className={`rounded-xl border ${isToday ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-[var(--border)] bg-[var(--card)]"}`}>
                <div className={`p-2 text-center border-b ${isToday ? "border-[#1E3A5F]/20" : "border-[var(--border)]"}`}>
                  <p className={`text-xs font-semibold ${isToday ? "text-[#1E3A5F]" : "text-[var(--muted-foreground)]"}`}>{DAY_SHORT[idx]}</p>
                  {isToday && <div className="h-1 w-1 bg-[#1E3A5F] rounded-full mx-auto mt-0.5" />}
                </div>
                <div className="p-1.5 space-y-1.5 min-h-[80px]">
                  {dayLessons.map((l) => (
                    <div key={l.id} className={`rounded-lg border px-1.5 py-1 ${groupColor.get(l.groupId) ?? COLORS[0]}`}>
                      <p className="text-xs font-medium leading-tight truncate">{l.groupName}</p>
                      <p className="text-xs opacity-70">{l.startTime}–{l.endTime}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day, idx) => {
            const dayLessons = schedule.filter((s) => s.dayOfWeek === DAY_KEYS[idx]);
            if (dayLessons.length === 0) return null;
            const isToday = idx === todayDayIndex;
            return (
              <Card key={idx} className={isToday ? "ring-2 ring-[#1E3A5F]" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {day}
                    {isToday && <Badge variant="default">Bugun</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[var(--border)]">
                    {dayLessons.map((l) => (
                      <div key={l.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-24 text-xs font-medium text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-lg px-2 py-1 text-center">{l.startTime}–{l.endTime}</div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{l.groupName}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted-foreground)]">
                            {l.teacherName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{l.teacherName}</span>}
                            {l.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.room}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {schedule.length === 0 && <p className="text-center text-[var(--muted-foreground)] text-sm py-8">Dars jadvali yo'q</p>}
        </div>
      )}
    </div>
  );
}