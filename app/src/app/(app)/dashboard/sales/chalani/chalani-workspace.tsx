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
  id: string; number: string; date: string; customer: string;
  vehicleNo: string; driverName: string; invoiceNumber: string | null; itemCount: number;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Customer = { id: string; name: string };
type InvoiceOpt = { id: string; label: string };

export function ChalaniWorkspace({
  initial, customers, recentInvoices, canCreate,
}: {
  initial: List; customers: Customer[]; recentInvoices: InvoiceOpt[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Chalani"]}
        title="Chalani"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Chalani</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        Dispatch / delivery register — records goods physically sent out (vehicle, driver).
        Paperwork only: it doesn&apos;t affect stock or the ledger, which the Sales Invoice already owns.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No dispatch notes yet" hint="Record goods leaving the premises." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Chalani No.</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 text-right font-medium">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.customer}</td>
                  <td className="px-4 py-2.5 text-muted">{r.vehicleNo}</td>
                  <td className="px-4 py-2.5 text-muted">{r.driverName}</td>
                  <td className="px-4 py-2.5 text-muted">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <ChalaniForm
          customers={customers}
          recentInvoices={recentInvoices}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

type Line = { key: number; product: ProductOption | null; description: string; qty: string };
let keyc = 0;
const emptyLine = (): Line => ({ key: ++keyc, product: null, description: "", qty: "" });

function ChalaniForm({
  customers, recentInvoices, onClose, onSaved,
}: {
  customers: Customer[]; recentInvoices: InvoiceOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [customerLedgerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [salesDocId, setSalesDocId] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const patch = (key: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function save() {
    const payloadItems = lines
      .filter((l) => (Number(l.qty) || 0) > 0 && (l.product || l.description))
      .map((l) => ({
        productId: l.product?.id || undefined,
        description: l.description || l.product?.name || "Item",
        qty: Number(l.qty),
      }));
    if (payloadItems.length === 0) return toast("Add at least one item", "err");
    if (!customerLedgerId && !customerName) return toast("Select a customer or enter a name", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>("/api/sales/chalani", {
      method: "POST",
      body: JSON.stringify({
        date,
        customerLedgerId: customerLedgerId || undefined,
        customerName: customerLedgerId ? undefined : customerName,
        salesDocId: salesDocId || undefined,
        vehicleNo: vehicleNo || undefined,
        driverName: driverName || undefined,
        notes: notes || undefined,
        items: payloadItems,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Chalani ${res.data.doc.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Chalani" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer" required>
            <select value={customerLedgerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">— Enter a name —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {!customerLedgerId && (
            <Field label="Customer name">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Field>
          )}
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Linked invoice" hint="Optional">
            <select value={salesDocId} onChange={(e) => setSalesDocId(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {recentInvoices.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </Field>
          <Field label="Vehicle no.">
            <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. Ba 2 Cha 1234" />
          </Field>
          <Field label="Driver name">
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Qty</th>
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
                    <input
                      value={l.description}
                      onChange={(e) => patch(l.key, { description: e.target.value })}
                      placeholder="Description"
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number" step="0.001" value={l.qty}
                      onChange={(e) => patch(l.key, { qty: e.target.value })}
                      className={`${inputClass} text-right`}
                    />
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
