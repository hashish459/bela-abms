"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; supplier: string;
  countryOfOrigin: string; billOfEntryNo: string; portOfEntry: string; purchaseInvoiceNumber: string | null;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Supplier = { id: string; name: string };
type InvoiceOpt = { id: string; label: string };

export function ImportsWorkspace({
  initial, suppliers, recentInvoices, canCreate,
}: {
  initial: List; suppliers: Supplier[]; recentInvoices: InvoiceOpt[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Imports"]}
        title="Imports"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Import</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        Customs/compliance tracking for an import shipment. The linked Purchase Invoice
        already carries the customs and excise duty for landed-cost valuation — this is the
        paper trail alongside it (bill of entry, country, port).
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No import shipments yet" hint="Track an inbound customs shipment." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Shipment No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Country</th>
                <th className="px-4 py-2 font-medium">Bill of Entry</th>
                <th className="px-4 py-2 font-medium">Port</th>
                <th className="px-4 py-2 font-medium">Purchase Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.supplier}</td>
                  <td className="px-4 py-2.5 text-muted">{r.countryOfOrigin}</td>
                  <td className="px-4 py-2.5 text-muted">{r.billOfEntryNo}</td>
                  <td className="px-4 py-2.5 text-muted">{r.portOfEntry}</td>
                  <td className="px-4 py-2.5 text-muted">{r.purchaseInvoiceNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <ImportsForm
          suppliers={suppliers}
          recentInvoices={recentInvoices}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function ImportsForm({
  suppliers, recentInvoices, onClose, onSaved,
}: {
  suppliers: Supplier[]; recentInvoices: InvoiceOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [supplierLedgerId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [billOfEntryNo, setBillOfEntryNo] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!supplierLedgerId && !supplierName) return toast("Select a supplier or enter a name", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>("/api/purchase/imports", {
      method: "POST",
      body: JSON.stringify({
        date,
        supplierLedgerId: supplierLedgerId || undefined,
        supplierName: supplierLedgerId ? undefined : supplierName,
        countryOfOrigin: countryOfOrigin || undefined,
        billOfEntryNo: billOfEntryNo || undefined,
        portOfEntry: portOfEntry || undefined,
        purchaseInvoiceId: purchaseInvoiceId || undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Import shipment ${res.data.doc.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Import Shipment">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Country of origin">
            <Input value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} />
          </Field>
          <Field label="Bill of entry no.">
            <Input value={billOfEntryNo} onChange={(e) => setBillOfEntryNo(e.target.value)} />
          </Field>
          <Field label="Port of entry">
            <Input value={portOfEntry} onChange={(e) => setPortOfEntry(e.target.value)} />
          </Field>
          <Field label="Linked Purchase Invoice" hint="Optional">
            <select value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {recentInvoices.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </Field>
        </div>
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
