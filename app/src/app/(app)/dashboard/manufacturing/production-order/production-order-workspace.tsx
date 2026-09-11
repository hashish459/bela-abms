"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Order = {
  id: string; number: string; date: string; bomName: string; outputProductName: string;
  batches: string; outputQty: string; materialCost: string; laborCost: string; totalCost: string; unitCost: string;
};
type Bom = { id: string; name: string; outputProductName: string; outputQty: string; outputUnit: string; laborCostPerBatch: string };
type Warehouse = { id: string; name: string };

export function ProductionOrderWorkspace({
  initial, boms, warehouses, canCreate, hasFiscalYear,
}: {
  initial: Order[]; boms: Bom[]; warehouses: Warehouse[]; canCreate: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        crumbs={["Manufacturing", "Production Order"]}
        title="Production Order"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)} disabled={!boms.length}>
              <Plus size={15} /> New Production Order
            </Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before running production.
        </Card>
      )}
      {!boms.length && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Create a Bill of Materials first, under the Bill of Materials tab.
        </Card>
      )}
      <p className="mb-3 text-xs text-muted">
        Running an order consumes each component at its current weighted-average cost and
        produces the output at (materials + labor) ÷ output quantity — the same costing
        principle used everywhere else in the system.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No production orders yet" hint="Run your first batch." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Output</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Total Cost</th>
                <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((o) => (
                <tr key={o.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">
                    <button onClick={() => setViewing(o.id)} className="text-left font-medium hover:underline">{o.number}</button>
                    <p className="text-xs text-muted">{o.bomName} · {o.date}</p>
                  </td>
                  <td className="px-4 py-2.5">{o.outputProductName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{o.outputQty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">Rs. {o.totalCost}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">Rs. {o.unitCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <OrderForm
          boms={boms}
          warehouses={warehouses}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {viewing && <OrderDetail id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function OrderForm({
  boms, warehouses, onClose, onSaved,
}: {
  boms: Bom[]; warehouses: Warehouse[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [batches, setBatches] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const bom = boms.find((b) => b.id === bomId);
  const previewOutput = bom ? (Number(bom.outputQty) * (Number(batches) || 0)).toFixed(3) : "0";

  async function save() {
    if (!bomId) return toast("Select a BOM", "err");
    if (!warehouseId) return toast("Select a warehouse", "err");
    if (!batches || Number(batches) <= 0) return toast("Enter how many batches to run", "err");

    setSaving(true);
    const res = await api<{ order: { number: string; totalCost: string } }>("/api/manufacturing/production-orders", {
      method: "POST",
      body: JSON.stringify({ date, bomId, warehouseId, batches: Number(batches), notes: notes || undefined }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Production order ${res.data.order.number} posted — Rs. ${res.data.order.totalCost}`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Production Order">
      <div className="space-y-3">
        <Field label="Bill of Materials" required>
          <select value={bomId} onChange={(e) => setBomId(e.target.value)} className={inputClass}>
            {boms.map((b) => (
              <option key={b.id} value={b.id}>{b.name} — produces {b.outputProductName}</option>
            ))}
          </select>
        </Field>
        <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Warehouse" required>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClass}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Batches" required hint={bom ? `Will produce ~${previewOutput} ${bom.outputUnit}` : undefined}>
          <Input type="number" step="0.001" value={batches} onChange={(e) => setBatches(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Run Production</Button>
      </div>
    </Modal>
  );
}

type Detail = {
  number: string; date: string; bomName: string; outputProductName: string;
  batches: string; outputQty: string; materialCost: string; laborCost: string; totalCost: string; unitCost: string;
  notes: string | null;
  items: { componentName: string; qty: string; unitCost: string; amount: string }[];
};

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ order: Detail }>(`/api/manufacturing/production-orders/${id}`).then((res) => {
        if (res.ok) setData(res.data.order);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <Modal open onClose={onClose} title={loading ? "Loading…" : `${data?.number}`} wide>
      {loading || !data ? (
        <p className="p-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted">BOM</p><p className="font-medium">{data.bomName}</p></div>
            <div><p className="text-xs text-muted">Output</p><p className="font-medium">{data.outputProductName}</p></div>
            <div><p className="text-xs text-muted">Quantity produced</p><p className="font-medium tabular-nums">{data.outputQty}</p></div>
            <div><p className="text-xs text-muted">Material cost</p><p className="font-medium tabular-nums">Rs. {data.materialCost}</p></div>
            <div><p className="text-xs text-muted">Labor cost</p><p className="font-medium tabular-nums">Rs. {data.laborCost}</p></div>
            <div><p className="text-xs text-muted">Unit cost</p><p className="font-medium tabular-nums">Rs. {data.unitCost}</p></div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Components Consumed</h3>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Component</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{it.componentName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">Rs. {data.totalCost}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>
        </div>
      )}
    </Modal>
  );
}
