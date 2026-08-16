"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { inventoryApi, branchesApi, studentsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface ItemRow {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
}
interface LogRow { id: string; itemId: string; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; reason: string | null; createdAt: string; }
interface BranchOption { id: string; name: string; }
interface StudentOption { id: string; fullName: string; }
interface SessionSale { id: string; studentName: string; itemName: string; amount: number; date: string; }

function extractErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (Array.isArray(data?.message)) return data.message[0];
  return data?.message || "Xatolik yuz berdi";
}

const NO_BRANCH_SELECTED = "";
const emptyItemForm = { name: "", sku: "", branchId: NO_BRANCH_SELECTED, price: "", quantity: "", minLevel: "" };
const emptyLogForm = { itemId: "", type: "IN" as "IN" | "OUT", quantity: "", reason: "" };
const emptySaleForm = { studentId: "", itemId: "", quantity: "1", amount: "" };

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"items" | "logs" | "sales">("items");
  const [itemModal, setItemModal] = React.useState(false);
  const [logModal, setLogModal] = React.useState(false);
  const [saleModal, setSaleModal] = React.useState(false);
  const [itemForm, setItemForm] = React.useState(emptyItemForm);
  const [logForm, setLogForm] = React.useState(emptyLogForm);
  const [saleForm, setSaleForm] = React.useState(emptySaleForm);
  const [addingBranch, setAddingBranch] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState("");
  const [sessionSales, setSessionSales] = React.useState<SessionSale[]>([]);

  const { data: itemsRes } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: () => inventoryApi.getAllItems({ limit: 200 }).then((r) => r.data as { data: ItemRow[]; meta: { total: number } }),
  });
  const items = itemsRes?.data ?? [];
  const itemMap = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const lowStockItems = items.filter((i) => i.stockQuantity <= i.minStockLevel);

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-options"],
    queryFn: () => branchesApi.getAll({ limit: 100 }).then((r) => r.data as { data: BranchOption[] }),
  });
  const branches = branchesRes?.data ?? [];

  const { data: studentsRes } = useQuery({
    queryKey: ["students-options"],
    queryFn: () => studentsApi.getAll({ limit: 500 }).then((r) => r.data as { data: StudentOption[] }),
  });
  const students = studentsRes?.data ?? [];

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["inventory-logs", items.map((i) => i.id)],
    queryFn: async () => {
      const details = await Promise.all(items.map((i) => inventoryApi.getItemById(i.id).then((r) => r.data as { logs: LogRow[] })));
      return details.flatMap((d) => d.logs).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: tab === "logs" && items.length > 0,
  });

  const createBranchMutation = useMutation({
    mutationFn: (name: string) => branchesApi.create({ name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["branches-options"] });
      const newBranch = res.data as { id: string };
      setItemForm((f) => ({ ...f, branchId: newBranch.id }));
      setNewBranchName("");
      setAddingBranch(false);
      toast.success("Filial qo'shildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createItem({
        branchId: itemForm.branchId,
        name: itemForm.name,
        sku: itemForm.sku || undefined,
        price: itemForm.price ? Number(itemForm.price) : undefined,
        stockQuantity: Number(itemForm.quantity) || 0,
        minStockLevel: itemForm.minLevel ? Number(itemForm.minLevel) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Mahsulot qo'shildi");
      setItemModal(false);
      setItemForm(emptyItemForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const logMutation = useMutation({
    mutationFn: () => {
      const payload = { itemId: logForm.itemId, quantity: Number(logForm.quantity), reason: logForm.reason || undefined };
      return logForm.type === "IN" ? inventoryApi.stockIn(payload) : inventoryApi.stockOut(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      toast.success(logForm.type === "IN" ? "Kirim qilindi" : "Chiqim qilindi");
      setLogModal(false);
      setLogForm(emptyLogForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const saleMutation = useMutation({
    mutationFn: () =>
      inventoryApi.sell({
        studentId: saleForm.studentId,
        itemId: saleForm.itemId,
        quantity: Number(saleForm.quantity) || 1,
        amount: Number(saleForm.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      const student = students.find((s) => s.id === saleForm.studentId);
      const item = itemMap.get(saleForm.itemId);
      setSessionSales((prev) => [{ id: crypto.randomUUID(), studentName: student?.fullName ?? "—", itemName: item?.name ?? "—", amount: Number(saleForm.amount), date: new Date().toISOString() }, ...prev]);
      toast.success("Savdo amalga oshirildi");
      setSaleModal(false);
      setSaleForm(emptySaleForm);
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.branchId) { toast.error("Nomi va filialni kiriting"); return; }
    createItemMutation.mutate();
  };

  const handleSaveLog = () => {
    if (!logForm.itemId || !logForm.quantity) { toast.error("Mahsulot va miqdorni kiriting"); return; }
    logMutation.mutate();
  };

  const handleSaveSale = () => {
    if (!saleForm.studentId || !saleForm.itemId || !saleForm.amount) { toast.error("Barcha maydonlarni to'ldiring"); return; }
    saleMutation.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Ombor</h1>
          {lowStockItems.length > 0 && <p className="text-sm text-amber-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{lowStockItems.length} ta mahsulot kam</p>}
        </div>
        <div className="flex gap-2">
          {tab === "items" && <Button onClick={() => setItemModal(true)}><Plus className="h-4 w-4" />Mahsulot</Button>}
          {tab === "logs" && <Button onClick={() => setLogModal(true)}><Plus className="h-4 w-4" />Kirim/Chiqim</Button>}
          {tab === "sales" && <Button onClick={() => setSaleModal(true)}><Plus className="h-4 w-4" />Savdo</Button>}
        </div>
      </div>

      <div className="flex gap-2">
        {([["items", "Mahsulotlar"], ["logs", "Harakat"], ["sales", "Savdolar"]] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-[#1E3A5F] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isLow = item.stockQuantity <= item.minStockLevel;
            return (
              <Card key={item.id} className={isLow ? "border-amber-300" : ""}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isLow ? "bg-amber-100" : "bg-[#1E3A5F]/10"}`}>
                        <Package className={`h-4 w-4 ${isLow ? "text-amber-600" : "text-[#1E3A5F]"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{item.sku ?? "—"}</p>
                      </div>
                    </div>
                    {isLow && <Badge variant="warning">Kam</Badge>}
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-[var(--muted-foreground)]">Qoldiq</span>
                    <span className={`font-bold ${isLow ? "text-amber-500" : "text-[#1E3A5F]"}`}>{item.stockQuantity} ta</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isLow ? "bg-amber-400" : "bg-green-500"}`} style={{ width: `${Math.min((item.stockQuantity / (item.minStockLevel * 3 || 1)) * 100, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && <p className="text-sm text-[var(--muted-foreground)] col-span-full text-center py-12">Mahsulotlar yo'q</p>}
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-2">
          {logsLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Yuklanmoqda...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Harakatlar yo'q</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${log.type === "IN" ? "bg-green-100" : "bg-red-100"}`}>
                  {log.type === "IN" ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{itemMap.get(log.itemId)?.name ?? "—"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{log.reason ?? "—"} • {formatDateTime(log.createdAt)}</p>
                </div>
                <span className={`font-bold text-sm shrink-0 ${log.type === "IN" ? "text-green-600" : "text-red-500"}`}>
                  {log.type === "IN" ? "+" : "-"}{log.quantity}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sales" && (
        <div className="space-y-2">
          {sessionSales.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
              Joriy seansda savdo amalga oshirilmagan. (Eslatma: backend hozircha savdolar tarixini o'qish uchun API taqdim etmaydi — bu ro'yxat faqat joriy seans davomida amalga oshirilgan savdolarni ko'rsatadi.)
            </p>
          ) : (
            sessionSales.map((sale) => (
              <div key={sale.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-[#1E3A5F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{sale.studentName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{sale.itemName} • {formatDateTime(sale.date)}</p>
                </div>
                <span className="font-bold text-sm shrink-0 text-green-600">{formatCurrency(sale.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={itemModal} onOpenChange={setItemModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Yangi mahsulot</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <Input label="Nomi *" value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="Darslik nomi" />
            <Input label="SKU" value={itemForm.sku} onChange={(e) => setItemForm((f) => ({ ...f, sku: e.target.value }))} placeholder="BK-001" />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Filial *</label>
              {addingBranch ? (
                <div className="flex gap-1.5">
                  <Input value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="Chilonzor filiali" autoFocus />
                  <Button size="sm" className="shrink-0" loading={createBranchMutation.isPending} onClick={() => newBranchName.trim() && createBranchMutation.mutate(newBranchName.trim())}>+</Button>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setAddingBranch(false); setNewBranchName(""); }}>×</Button>
                </div>
              ) : (
                <Select value={itemForm.branchId} onValueChange={(v) => v === "__add_new__" ? setAddingBranch(true) : setItemForm((f) => ({ ...f, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Filial tanlang" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    <SelectItem value="__add_new__">+ Yangi filial qo'shish</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Miqdor" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="50" />
              <Input label="Min. daraja" type="number" value={itemForm.minLevel} onChange={(e) => setItemForm((f) => ({ ...f, minLevel: e.target.value }))} placeholder="5" />
            </div>
            <Input label="Narxi (so'm)" type="number" value={itemForm.price} onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))} placeholder="45000" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModal(false)}>Bekor qilish</Button>
            <Button onClick={handleSaveItem} loading={createItemMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logModal} onOpenChange={setLogModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Kirim / Chiqim</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mahsulot *</label>
              <Select value={logForm.itemId} onValueChange={(v) => setLogForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              {(["IN", "OUT"] as const).map((t) => (
                <button key={t} onClick={() => setLogForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${logForm.type === t ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
                  {t === "IN" ? "Kirim" : "Chiqim"}
                </button>
              ))}
            </div>
            <Input label="Miqdor *" type="number" value={logForm.quantity} onChange={(e) => setLogForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="10" />
            <Input label="Sabab" value={logForm.reason} onChange={(e) => setLogForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Yetkazib berish / Savdo..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogModal(false)}>Bekor qilish</Button>
            <Button onClick={handleSaveLog} loading={logMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saleModal} onOpenChange={setSaleModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Kitob savdosi</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">O'quvchi *</label>
              <Select value={saleForm.studentId} onValueChange={(v) => setSaleForm((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mahsulot *</label>
              <Select
                value={saleForm.itemId}
                onValueChange={(v) => setSaleForm((f) => ({ ...f, itemId: v, amount: itemMap.get(v)?.price ? String(itemMap.get(v)!.price) : f.amount }))}
              >
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.stockQuantity} ta)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Miqdor" type="number" value={saleForm.quantity} onChange={(e) => setSaleForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="1" />
              <Input label="Narxi (so'm) *" type="number" value={saleForm.amount} onChange={(e) => setSaleForm((f) => ({ ...f, amount: e.target.value }))} placeholder="35000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleModal(false)}>Bekor qilish</Button>
            <Button onClick={handleSaveSale} loading={saleMutation.isPending}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
