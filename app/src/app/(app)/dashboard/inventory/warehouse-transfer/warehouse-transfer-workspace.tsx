"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { ProductPicker, type ProductOption } from "@/components/product-picker";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; fromWarehouse: string; toWarehouse: string; itemCount: number;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Warehouse = { id: string; name: string };

export function WarehouseTransferWorkspace({
  initial, warehouses, canCreate,
}: {
  initial: List; warehouses: Warehouse[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Warehouse Transfer"]}
        title="Warehouse Transfer"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Transfer</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        Moves stock between two warehouses — posts a real stock movement, but no GL entry
        (a transfer changes where stock sits, never its value).
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No transfers yet" hint="Move stock between two warehouses." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Transfer No.</th>
                <th className="px-4 py-2 font-medium">From</th>
                <th className="px-4 py-2 font-medium">To</th>
                <th className="px-4 py-2 text-right font-medium">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.fromWarehouse}</td>
                  <td className="px-4 py-2.5">{r.toWarehouse}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <WarehouseTransferForm
          warehouses={warehouses}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

type Line = { key: number; product: ProductOption | null; qty: string };
let keyc = 0;
const emptyLine = (): Line => ({ key: ++keyc, product: null, qty: "" });

function WarehouseTransferForm({
  warehouses, onClose, onSaved,
}: {
  warehouses: Warehouse[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const patch = (key: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function save() {
    if (!fromWarehouseId || !toWarehouseId) return toast("Select both warehouses", "err");
    if (fromWarehouseId === toWarehouseId) return toast("Source and destination must be different", "err");
    const payloadItems = lines
      .filter((l) => l.product && (Number(l.qty) || 0) > 0)
      .map((l) => ({ productId: l.product!.id, qty: Number(l.qty) }));
    if (payloadItems.length === 0) return toast("Add at least one item", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>("/api/inventory/warehouse-transfer", {
      method: "POST",
      body: JSON.stringify({ date, fromWarehouseId, toWarehouseId, notes: notes || undefined, items: payloadItems }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Transfer ${res.data.doc.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Warehouse Transfer" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From warehouse" required>
            <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="To warehouse" required>
            <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Qty</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.key}>
                  <td className="min-w-56 px-2 py-1.5">
                    <ProductPicker value={l.product} onChange={(p) => patch(l.key, { product: p })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.001" value={l.qty} onChange={(e) => patch(l.key, { qty: e.target.value })} className={`${inputClass} text-right`} />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {lines.length > 1 && (
                      <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-muted hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setLines((ls) => [...ls, emptyLine()])} className="text-sm font-medium text-accent hover:underline">
          + Add Item
        </button>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
