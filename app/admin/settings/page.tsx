"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Building2, Bell, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { settingsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface SettingRow { id: string; key: string; value: string | null; type: string; }

const FIELD_KEYS = [
  "center_name", "center_phone", "center_email", "center_address",
  "eskiz_sms_key", "telegram_bot_token", "sendgrid_api_key",
  "click_merchant_id", "payme_merchant_id", "uzum_api_key",
] as const;
type FieldKey = typeof FIELD_KEYS[number];

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useUIStore();
  const [form, setForm] = React.useState<Record<FieldKey, string>>(
    Object.fromEntries(FIELD_KEYS.map((k) => [k, ""])) as Record<FieldKey, string>,
  );

  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => settingsApi.getAllSettings().then((r) => r.data as { data: SettingRow[] }),
  });

  React.useEffect(() => {
    if (!data?.data) return;
    const map = new Map(data.data.map((s) => [s.key, s.value ?? ""]));
    setForm((f) => {
      const next = { ...f };
      for (const k of FIELD_KEYS) if (map.has(k)) next[k] = map.get(k)!;
      return next;
    });
  }, [data]);

  const { data: auditRes } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => settingsApi.getAuditLogs({ limit: 10 }).then((r) => r.data as { data: { id: string; action: string; tableName: string; createdAt: string }[]; meta: { total: number } }),
  });
  const auditLogs = auditRes?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        FIELD_KEYS.map((key) => settingsApi.upsertSetting({ key, value: form[key] || undefined })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("Sozlamalar saqlandi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const set = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Sozlamalar</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Tizim sozlamalari</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />O'quv markazi ma'lumotlari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Markaz nomi" value={form.center_name} onChange={set("center_name")} placeholder="EduCenter Pro" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefon" value={form.center_phone} onChange={set("center_phone")} placeholder="+998 71 123 45 67" />
            <Input label="Email" value={form.center_email} onChange={set("center_email")} placeholder="info@educenter.uz" />
          </div>
          <Input label="Manzil" value={form.center_address} onChange={set("center_address")} placeholder="Toshkent sh., Chilonzor t." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />Ko'rinish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mavzu</label>
            <div className="flex gap-3">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${theme === t ? "border-[#1E3A5F] bg-[#1E3A5F] text-white" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
                >
                  {t === "light" ? "Yorug'" : t === "dark" ? "Qorong'u" : "Sistema"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />Bildirishnomalar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="SMS API kaliti (Eskiz)" type="password" value={form.eskiz_sms_key} onChange={set("eskiz_sms_key")} placeholder="Eskiz SMS API key" />
          <Input label="Telegram Bot token" type="password" value={form.telegram_bot_token} onChange={set("telegram_bot_token")} placeholder="Bot token" />
          <Input label="SendGrid API kaliti" type="password" value={form.sendgrid_api_key} onChange={set("sendgrid_api_key")} placeholder="SendGrid key" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />To'lov integratsiyasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Click Merchant ID" value={form.click_merchant_id} onChange={set("click_merchant_id")} placeholder="Click merchantId" />
          <Input label="Payme Merchant ID" value={form.payme_merchant_id} onChange={set("payme_merchant_id")} placeholder="Payme merchantId" />
          <Input label="Uzum API Key" type="password" value={form.uzum_api_key} onChange={set("uzum_api_key")} placeholder="Uzum API key" />
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="w-full sm:w-auto">
        <Save className="h-4 w-4" />Saqlash
      </Button>

      {auditLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Oxirgi audit loglari</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                <span>{log.action} — {log.tableName}</span>
                <span className="text-[var(--muted-foreground)]">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}