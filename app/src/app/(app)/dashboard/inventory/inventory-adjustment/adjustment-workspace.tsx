"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { ProductPicker, type ProductOption } from "@/components/product-picker";
import { adToBs } from "@/lib/bs-date";

type Row = { id: string; number: string; date: string; type: string; notes: string | null; lineCount: number };
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type WH = { id: string; name: string };

const TYPES = ["INCREASE", "DECREASE", "DAMAGE", "EXPIRY", "RECOUNT", "OPENING"] as const;

export function AdjustmentWorkspace({
  initial,
  warehouses,
  canCreate,
}: {
  initial: List;
  warehouses: WH[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Inventory Adjustment"]}
        title="Inventory Adjustment"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New adjustment
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Number</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Lines</th>
              <th className="px-4 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No adjustments yet.
                </td>
              </tr>
            )}
            {initial.rows.map((a) => (
              <tr key={a.id} className="hover:bg-accent-tint">
                <td className="px-4 py-2.5">
                  {a.date} <span className="text-xs text-muted">(BS {adToBs(a.date)})</span>
                </td>
                <td className="px-4 py-2.5 font-medium">{a.number}</td>
                <td className="px-4 py-2.5">{a.type[0] + a.type.slice(1).toLowerCase()}</td>
                <td className="px-4 py-2.5">{a.lineCount}</td>
                <td className="px-4 py-2.5 text-muted">{a.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {creating && (
        <AdjustmentForm
          warehouses={warehouses}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

type Line = { key: number; product: ProductOption | null; qty: string };
let kc = 0;
const emptyLine = (): Line => ({ key: ++kc, product: null, qty: "" });

function AdjustmentForm({
  warehouses,
  onClose,
  onSaved,
}: {
  warehouses: WH[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [type, setType] = useState<(typeof TYPES)[number]>("INCREASE");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // DECREASE/DAMAGE/EXPIRY reduce stock; INCREASE/RECOUNT/OPENING add.
  const negative = ["DECREASE", "DAMAGE", "EXPIRY"].includes(type);

  const patch = (key: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function save() {
    const payload = lines
      .filter((l) => l.product && parseFloat(l.qty) > 0)
      .map((l) => ({
        productId: l.product!.id,
        qty: (negative ? -1 : 1) * parseFloat(l.qty),
      }));
    if (payload.length === 0) return toast("Add at least one product line", "err");

    setSaving(true);
    const res = await api<{ adjustment: { number: string } }>("/api/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({ date, type, warehouseId, notes, lines: payload }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Adjustment ${res.data.adjustment.number} saved`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New inventory adjustment" wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Adjustment type" required>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t[0] + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </Field>
          <Field label="Warehouse" required>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClass}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-xs text-muted">
          {negative ? "This will reduce" : "This will increase"} stock in {warehouses.find((w) => w.id === warehouseId)?.name}.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Item / product</th>
                <th className="w-32 px-2 py-2 text-right font-medium">Qty</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.key}>
                  <td className="min-w-56 px-2 py-1.5">
                    <ProductPicker
                      value={l.product}
                      onChange={(p) => patch(l.key, { product: p })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={l.qty}
                      onChange={(e) => patch(l.key, { qty: e.target.value })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {lines.length > 1 && (
                      <button
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setLines((ls) => [...ls, emptyLine()])}
          className="text-sm font-medium text-accent hover:underline"
        >
          + Add code or product
        </button>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
