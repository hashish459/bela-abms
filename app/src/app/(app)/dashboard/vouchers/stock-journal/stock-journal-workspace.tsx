"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";
import { ProductPicker, type ProductOption } from "@/components/product-picker";
import { adToBs } from "@/lib/bs-date";

type Row = { id: string; number: string; date: string; narration: string | null; amount: string; by: string };
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Warehouse = { id: string; name: string };

export function StockJournalWorkspace({
  initial, warehouses, canCreate, hasFiscalYear,
}: {
  initial: List; warehouses: Warehouse[]; canCreate: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Vouchers", "Stock Journal"]}
        title="Stock Journal"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Stock Journal
            </Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year first.
        </Card>
      )}
      <p className="mb-3 text-xs text-muted">
        For a stock change that also needs to hit the books as a value gain or loss (theft,
        breakage, a found-stock correction) — a routine recount with no GL impact belongs
        under Inventory › Inventory Adjustment instead.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No stock journals yet" hint="Record a stock write-off or value correction." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Voucher No.</th>
                <th className="px-4 py-2 font-medium">Narration</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((v) => (
                <tr key={v.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">
                    {v.date} <span className="ml-1 text-xs text-muted">(BS {adToBs(v.date)})</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{v.number}</td>
                  <td className="px-4 py-2.5 text-muted">{v.narration || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">Rs. {v.amount}</td>
                  <td className="px-4 py-2.5 text-muted">{v.by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <StockJournalForm
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

function StockJournalForm({
  warehouses, onClose, onSaved,
}: {
  warehouses: Warehouse[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [direction, setDirection] = useState<"IN" | "OUT">("OUT");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [narration, setNarration] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!product) return toast("Select a product", "err");
    if (!warehouseId) return toast("Select a warehouse", "err");
    if (!qty || Number(qty) <= 0) return toast("Enter a quantity", "err");
    if (!unitCost || Number(unitCost) <= 0) return toast("Enter the unit value", "err");

    setSaving(true);
    const res = await api<{ voucher: { number: string } }>("/api/accounts/stock-journal", {
      method: "POST",
      body: JSON.stringify({
        date, productId: product.id, warehouseId,
        qty: direction === "IN" ? Number(qty) : -Number(qty),
        unitCost: Number(unitCost), narration: narration || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Stock journal ${res.data.voucher.number} posted`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Stock Journal">
      <div className="space-y-3">
        <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Product" required>
          <ProductPicker value={product} onChange={setProduct} kind="GOODS" />
        </Field>
        <Field label="Warehouse" required>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClass}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Direction" required>
          <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className={inputClass}>
            <option value="OUT">Stock decrease (write-off / loss)</option>
            <option value="IN">Stock increase (found / gain)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" required>
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Value per unit (Rs.)" required>
            <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </Field>
        </div>
        <Field label="Narration">
          <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Warehouse fire damage" />
        </Field>
        {qty && unitCost && (
          <p className="text-xs text-muted">
            Will post: {direction === "OUT" ? "Dr Inventory Adjustment Account" : "Dr Inventory"} / {direction === "OUT" ? "Cr Inventory" : "Cr Inventory Adjustment Account"} — Rs.{" "}
            {(Number(qty) * Number(unitCost)).toFixed(2)}
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Post</Button>
      </div>
    </Modal>
  );
}
