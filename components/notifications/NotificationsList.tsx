"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, Mail, Smartphone, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils";
import { notificationsApi } from "@/lib/api";

type Channel = "SMS" | "TELEGRAM" | "EMAIL" | "IN_APP";

interface NotificationRow {
  id: string;
  type: Channel;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<Channel, React.ReactNode> = {
  SMS: <Smartphone className="h-4 w-4" />,
  TELEGRAM: <MessageSquare className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  IN_APP: <Bell className="h-4 w-4" />,
};
const typeBg: Record<Channel, string> = {
  SMS: "bg-blue-100 text-blue-700",
  TELEGRAM: "bg-sky-100 text-sky-700",
  EMAIL: "bg-purple-100 text-purple-700",
  IN_APP: "bg-amber-100 text-amber-700",
};

interface NotificationsListProps {
  showTitle?: boolean;
}

export function NotificationsList({ showTitle = true }: NotificationsListProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<"ALL" | "READ" | "UNREAD">("ALL");

  const { data } = useQuery({
    queryKey: ["my-notifications", filter],
    queryFn: () =>
      notificationsApi
        .getAll({ limit: 100, isRead: filter === "ALL" ? undefined : filter === "READ" })
        .then((r) => r.data as { data: NotificationRow[]; meta: { unreadCount: number } }),
  });
  const notifications = data?.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {showTitle ? (
          <h1 className="text-xl sm:text-2xl font-bold">Xabarnomalar</h1>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-32 h-9 print:hidden"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barchasi</SelectItem>
              <SelectItem value="UNREAD">O'qilmagan</SelectItem>
              <SelectItem value="READ">O'qilgan</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => window.print()}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors print:hidden"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Xabarnomalar topilmadi</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 cursor-pointer ${!n.isRead ? "bg-[#1E3A5F]/5" : ""}`}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${typeBg[n.type]}`}>
                  {typeIcons[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-[#1E3A5F] shrink-0" />}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{n.message}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatRelativeTime(n.createdAt)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 print:hidden ${typeBg[n.type]}`}>{n.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
