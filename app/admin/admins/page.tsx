"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminsApi } from "@/lib/api";
import { formatPhoneInput } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

interface Admin {
  id: string;
  loginId: string | null;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
}

interface CreatedCredentials { loginId: string; tempPassword: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const empty = { fullName: "", phone: "" };

export default function AdminsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(empty);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Backend already rejects non-superadmins with 403 — this just keeps a
  // regular admin from sitting on an empty/error page if they land here.
  React.useEffect(() => {
    if (user && !user.isSuperAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const { data: admins = [] } = useQuery({
    queryKey: ["admins"],
    queryFn: () => adminsApi.getAll().then((r) => r.data as Admin[]),
    enabled: !!user?.isSuperAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof empty) => adminsApi.create({ fullName: data.fullName, phone: data.phone || undefined }).then((r) => r.data as CreatedCredentials),
    onSuccess: (data) => {
      toast.success("Admin qo'shildi");
      invalidate();
      setOpen(false);
      setCreated({ loginId: data.loginId, tempPassword: data.tempPassword });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof empty }) =>
      adminsApi.update(id, { fullName: data.fullName, phone: data.phone || undefined }),
    onSuccess: () => { toast.success("Yangilandi"); invalidate(); setOpen(false); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminsApi.update(id, { isActive }),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsApi.delete(id),
    onSuccess: () => { toast.success("Admin o'chirildi"); invalidate(); },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const openAdd = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Admin) => { setEditId(a.id); setForm({ fullName: a.fullName ?? "", phone: a.phone ?? "" }); setOpen(true); };

  const handleSave = () => {
    if (!form.fullName || form.fullName.length < 2) { toast.error("Ism-familiyani kiriting"); return; }
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = async (id: string) => {
    if (await confirm("Adminni o'chirishni tasdiqlaysizmi?")) deleteMutation.mutate(id);
  };

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`ID: ${created.loginId}\nParol: ${created.tempPassword}`);
    toast.success("Kirish ma'lumotlari nusxalandi!");
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Adminlar</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{admins.length} ta admin</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" />Admin qo'shish</Button>
      </div>

      {created && (
        <Card className="border-green-300 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Yangi adminning kirish ma'lumotlari</p>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">ID raqami</p>
                <span className="font-mono font-bold text-[#1E3A5F] text-lg bg-[#1E3A5F]/10 px-3 py-1 rounded-lg">{created.loginId}</span>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Parol</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1E3A5F] text-lg bg-[#1E3A5F]/10 px-3 py-1 rounded-lg">
                    {showPassword ? created.tempPassword : "••••••"}
                  </span>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[var(--muted-foreground)] hover:text-[#1E3A5F] transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copyCredentials}><Copy className="h-3.5 w-3.5" />Nusxalash</Button>
              <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>Yopish</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{a.fullName || "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">ID: {a.loginId}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>{a.isActive ? "Faol" : "Nofaol"}</span>
                <Switch
                  checked={a.isActive}
                  onCheckedChange={(v) => toggleActiveMutation.mutate({ id: a.id, isActive: v })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {admins.length === 0 && (
          <div className="col-span-full text-center text-[var(--muted-foreground)] py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">Adminlar yo'q</div>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} size="sm">
        <ModalHeader><ModalTitle>{editId ? "Adminni tahrirlash" : "Yangi admin"}</ModalTitle></ModalHeader>
        <div className="p-6 space-y-3">
          <Input label="Ism-familiya *" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Aziz Karimov" />
          <Input label="Telefon" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))} placeholder="+998 90 ..." />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
          <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>Saqlash</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
