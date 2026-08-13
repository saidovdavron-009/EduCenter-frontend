"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { notificationsApi, studentsApi, groupsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import toast from "react-hot-toast";

type Recipient = "ALL" | "GROUP" | "INDIVIDUAL";
type Channel = "SMS" | "TELEGRAM" | "EMAIL" | "IN_APP";

interface GroupOption { id: string; name: string; }
interface StudentOption { id: string; fullName: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

async function resolveUserIds(recipient: Recipient, groupId: string, studentId: string): Promise<string[]> {
  if (recipient === "INDIVIDUAL") {
    const student = await studentsApi.getById(studentId).then((r) => r.data as { userId: string });
    return [student.userId];
  }
  if (recipient === "GROUP") {
    const group = await groupsApi.getById(groupId).then((r) => r.data as { students: { id: string }[] });
    const userIds = await Promise.all(group.students.map((s) => studentsApi.getById(s.id).then((r) => (r.data as { userId: string }).userId)));
    return userIds;
  }
  const all = await studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: { id: string }[] });
  const userIds = await Promise.all(all.data.map((s) => studentsApi.getById(s.id).then((r) => (r.data as { userId: string }).userId)));
  return userIds;
}

const emptyForm = { recipient: "ALL" as Recipient, groupId: "", studentId: "", channel: "SMS" as Channel, title: "", message: "" };

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(emptyForm);

  const { data: groupsRes } = useQuery({
    queryKey: ["groups-options"],
    queryFn: () => groupsApi.getAll({ limit: 100 }).then((r) => r.data as { data: GroupOption[] }),
  });
  const groups = groupsRes?.data ?? [];

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 100 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      const userIds = await resolveUserIds(form.recipient, form.groupId, form.studentId);
      if (userIds.length === 0) throw new Error("Qabul qiluvchi topilmadi");
      return notificationsApi.sendBulk({ userIds, type: form.channel, title: form.title, message: form.message });
    },
    onSuccess: (res) => {
      const count = (res.data as { count?: number })?.count ?? 1;
      toast.success(`${count} ta xabar yuborildi`);
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : extractErrorMessage(e)),
  });

  const handleSend = () => {
    if (!form.title || !form.message) { toast.error("Sarlavha va xabarni kiriting"); return; }
    if (form.recipient === "GROUP" && !form.groupId) { toast.error("Guruhni tanlang"); return; }
    if (form.recipient === "INDIVIDUAL" && !form.studentId) { toast.error("O'quvchini tanlang"); return; }
    sendMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Bildirishnomalar va Xabarlar</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">SMS, Telegram, Email va tizim xabarlari</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Xabar yuborish</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kimga</label>
                  <Select value={form.recipient} onValueChange={(v) => setForm((f) => ({ ...f, recipient: v as Recipient }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Barcha o'quvchilar</SelectItem>
                      <SelectItem value="GROUP">Guruh</SelectItem>
                      <SelectItem value="INDIVIDUAL">Alohida o'quvchi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.recipient === "GROUP" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Guruh *</label>
                    <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Guruh tanlang" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.recipient === "INDIVIDUAL" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">O'quvchi *</label>
                    <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
                      <SelectTrigger><SelectValue placeholder="O'quvchi tanlang" /></SelectTrigger>
                      <SelectContent>
                        {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1.5">Kanal</label>
                  <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v as Channel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="TELEGRAM">Telegram</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="IN_APP">Tizim ichida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input label="Sarlavha *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                <Textarea label="Xabar *" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />

                <Button className="w-full" loading={sendMutation.isPending} onClick={handleSend}>
                  <Send className="h-4 w-4" />
                  Yuborish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification List */}
        <div className="lg:col-span-3">
          <NotificationsList showTitle={false} />
        </div>
      </div>
    </div>
  );
}