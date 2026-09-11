"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import {
  PurchaseLineEditor, newPurchaseLine, type PurchaseEditorLine, type PurchaseTotals,
} from "@/components/purchase-line-editor";
import type { TaxOpt } from "@/components/sales-line-editor";
import { adToBs } from "@/lib/bs-date";

type Row = { id: string; number: string; date: string; supplier: string; grandTotal: string; status: string };
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Supplier = { id: string; name: string; pan: string | null };

export function PurchaseOrderWorkspace({
  initial, suppliers, taxRates, canCreate, hasFiscalYear,
}: {
  initial: List; suppliers: Supplier[]; taxRates: TaxOpt[]; canCreate: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function convert(id: string) {
    const res = await api(`/api/purchase/docs/${id}/convert`, { method: "POST", body: JSON.stringify({ toType: "INVOICE" }) });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Opening a new purchase invoice with these items.");
    router.push("/dashboard/purchase/purchase-bills");
  }

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Purchase Order"]}
        title="Purchase Order"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Purchase Order
            </Button>
          )
        }
      />
      {initial.rows.length === 0 ? (
        <EmptyState title="No purchase orders" hint="A purchase order does not affect stock or the ledger until converted to an invoice." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((d) => (
                <tr key={d.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{d.date}</td>
                  <td className="px-4 py-2.5 font-medium">{d.number}</td>
                  <td className="px-4 py-2.5">{d.supplier}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.grandTotal}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{d.status}</td>
                  <td className="px-4 py-2.5 text-right">
                    {d.status !== "CONVERTED" && (
                      <Button variant="ghost" onClick={() => convert(d.id)}>
                        <ArrowRight size={13} /> Invoice
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <PurchaseOrderForm
          suppliers={suppliers} taxRates={taxRates}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function PurchaseOrderForm({
  suppliers, taxRates, onClose, onSaved,
}: {
  suppliers: Supplier[]; taxRates: TaxOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [supplierLedgerId, setSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<PurchaseEditorLine[]>([newPurchaseLine()]);
  const [totals, setTotals] = useState<PurchaseTotals | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const payloadLines = lines
      .filter((l) => (Number(l.qty) || 0) > 0 && (l.product || l.description))
      .map((l) => ({
        productId: l.product?.id || undefined,
        description: l.description || l.product?.name || "Item",
        hsCode: l.hsCode || undefined,
        qty: Number(l.qty), rate: Number(l.rate) || 0, discount: Number(l.discount) || 0,
        exciseDuty: Number(l.exciseDuty) || 0, customDuty: Number(l.customDuty) || 0,
        taxRateId: l.taxRateId || undefined, isNonTaxable: !l.taxRateId,
      }));
    if (!supplierLedgerId) return toast("Select a supplier", "err");
    if (payloadLines.length === 0) return toast("Add at least one line item", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>("/api/purchase/orders", {
      method: "POST",
      body: JSON.stringify({
        date, supplierLedgerId, referenceNo: referenceNo || undefined, notes: notes || undefined,
        invoiceDiscount: Number(invoiceDiscount) || 0, lines: payloadLines,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Purchase order ${res.data.doc.number} created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Purchase Order" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Supplier name" required>
            <select value={supplierLedgerId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {suppliers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Reference">
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </Field>
        </div>

        <PurchaseLineEditor
          lines={lines} setLines={setLines} taxRates={taxRates}
          invoiceDiscount={invoiceDiscount} setInvoiceDiscount={setInvoiceDiscount}
          onTotals={setTotals}
        />

        <Field label="Note">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted">
          Grand Total <strong className="text-foreground">Rs. {totals?.grandTotal ?? "0.00"}</strong>
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
