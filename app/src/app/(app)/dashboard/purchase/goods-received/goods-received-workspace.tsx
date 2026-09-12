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
  id: string; number: string; date: string; supplier: string;
  purchaseOrderNumber: string | null; qtyOrdered: number; qtyReceived: number;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Supplier = { id: string; name: string };
type OrderLine = { productId: string | null; description: string; qty: number };
type Order = { id: string; number: string; supplierLedgerId: string | null; supplierName: string | null; items: OrderLine[] };

export function GoodsReceivedWorkspace({
  initial, suppliers, openOrders, canCreate,
}: {
  initial: List; suppliers: Supplier[]; openOrders: Order[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Goods Received"]}
        title="Goods Received"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New GRN</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        Records what was physically counted in against a Purchase Order, before the
        supplier&apos;s invoice arrives. No stock or ledger impact — the Purchase Invoice still
        owns both.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No goods received yet" hint="Record a delivery against a Purchase Order." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">GRN No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Purchase Order</th>
                <th className="px-4 py-2 text-right font-medium">Ordered</th>
                <th className="px-4 py-2 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.supplier}</td>
                  <td className="px-4 py-2.5 text-muted">{r.purchaseOrderNumber ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.qtyOrdered || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{r.qtyReceived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <GoodsReceivedForm
          suppliers={suppliers}
          openOrders={openOrders}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

type Line = { key: number; product: ProductOption | null; description: string; qtyOrdered: string; qtyReceived: string };
let keyc = 0;
const emptyLine = (): Line => ({ key: ++keyc, product: null, description: "", qtyOrdered: "", qtyReceived: "" });

function GoodsReceivedForm({
  suppliers, openOrders, onClose, onSaved,
}: {
  suppliers: Supplier[]; openOrders: Order[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [supplierLedgerId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const patch = (key: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  function pickOrder(id: string) {
    setPurchaseOrderId(id);
    const order = openOrders.find((o) => o.id === id);
    if (!order) return;
    setSupplierId(order.supplierLedgerId ?? "");
    setSupplierName(order.supplierName ?? "");
    setLines(
      order.items.map((it) => ({
        key: ++keyc, product: null, description: it.description,
        qtyOrdered: String(it.qty), qtyReceived: String(it.qty),
      })),
    );
  }

  async function save() {
    const payloadItems = lines
      .filter((l) => (Number(l.qtyReceived) || 0) > 0 && (l.product || l.description))
      .map((l) => ({
        productId: l.product?.id || undefined,
        description: l.description || l.product?.name || "Item",
        qtyOrdered: l.qtyOrdered ? Number(l.qtyOrdered) : undefined,
        qtyReceived: Number(l.qtyReceived),
      }));
    if (payloadItems.length === 0) return toast("Add at least one item", "err");
    if (!supplierLedgerId && !supplierName) return toast("Select a supplier or enter a name", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>("/api/purchase/goods-received", {
      method: "POST",
      body: JSON.stringify({
        date,
        supplierLedgerId: supplierLedgerId || undefined,
        supplierName: supplierLedgerId ? undefined : supplierName,
        purchaseOrderId: purchaseOrderId || undefined,
        notes: notes || undefined,
        items: payloadItems,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`GRN ${res.data.doc.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Goods Received Note" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Against Purchase Order" hint="Optional — prefills the items below">
            <select value={purchaseOrderId} onChange={(e) => pickOrder(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {openOrders.map((o) => <option key={o.id} value={o.id}>{o.number} — {o.supplierName ?? "—"}</option>)}
            </select>
          </Field>
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Supplier" required>
            <select value={supplierLedgerId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">— Enter a name —</option>
              {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {!supplierLedgerId && (
            <Field label="Supplier name">
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </Field>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Ordered</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Received</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.key}>
                  <td className="min-w-48 px-2 py-1.5">
                    <ProductPicker value={l.product} onChange={(p) => patch(l.key, { product: p })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={l.description} onChange={(e) => patch(l.key, { description: e.target.value })} placeholder="Description" className={inputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.001" value={l.qtyOrdered} onChange={(e) => patch(l.key, { qtyOrdered: e.target.value })} className={`${inputClass} text-right`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.001" value={l.qtyReceived} onChange={(e) => patch(l.key, { qtyReceived: e.target.value })} className={`${inputClass} text-right`} />
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
