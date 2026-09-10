"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; customer: string;
  taxable: string; vat: string; grandTotal: string; status: string;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type InvItem = {
  productId: string; description: string; hsCode: string; qty: number; rate: number;
  discount: number; taxRateId: string; isNonTaxable: boolean;
};
type Invoice = { id: string; number: string; customer: string; grandTotal: string; items: InvItem[] };

export function CreditNoteWorkspace({
  initial,
  invoices,
  canCreate,
}: {
  initial: List;
  invoices: Invoice[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Credit Note"]}
        title="Credit Note"
        action={
          canCreate &&
          invoices.length > 0 && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Credit Note
            </Button>
          )
        }
      />
      <p className="mb-3 text-xs text-muted">
        A credit note reverses an invoice (in full or in part): it returns stock, reverses the
        VAT and revenue, and reduces the customer&apos;s balance.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No credit notes" hint="Issue one against a sales invoice to record a return." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Taxable</th>
                <th className="px-4 py-2 text-right font-medium">VAT</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((d) => (
                <tr key={d.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{d.date}</td>
                  <td className="px-4 py-2.5 font-medium">{d.number}</td>
                  <td className="px-4 py-2.5">{d.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.taxable}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.vat}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{d.grandTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <CreditNoteForm
          invoices={invoices}
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

type Line = InvItem & { key: number };

function CreditNoteForm({
  invoices,
  onClose,
  onSaved,
}: {
  invoices: Invoice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reversesDocId, setInvoiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  const invoice = invoices.find((i) => i.id === reversesDocId);

  function pickInvoice(id: string) {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    setLines((inv?.items ?? []).map((it, i) => ({ ...it, key: i })));
  }

  async function save() {
    const payload = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        productId: l.productId || undefined,
        description: l.description,
        hsCode: l.hsCode || undefined,
        qty: l.qty,
        rate: l.rate,
        discount: l.discount || 0,
        taxRateId: l.taxRateId || undefined,
        isNonTaxable: l.isNonTaxable || !l.taxRateId,
      }));
    if (!reversesDocId) return toast("Select the invoice to credit", "err");
    if (payload.length === 0) return toast("Set the return quantity on at least one line", "err");

    setSaving(true);
    const res = await api<{ creditNote: { number: string } }>("/api/sales/credit-notes", {
      method: "POST",
      body: JSON.stringify({ date, reversesDocId, notes: notes || undefined, lines: payload }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Credit note ${res.data.creditNote.number} issued`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Credit Note" wide>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Against invoice" required>
            <select value={reversesDocId} onChange={(e) => pickInvoice(e.target.value)} className={inputClass}>
              <option value="">Select invoice…</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} — {i.customer} ({i.grandTotal})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {invoice && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="w-24 px-2 py-2 text-right font-medium">Invoiced</th>
                  <th className="w-24 px-2 py-2 text-right font-medium">Return qty</th>
                  <th className="w-24 px-2 py-2 text-right font-medium">Rate</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l, idx) => {
                  const invoicedQty = invoice.items[idx]?.qty ?? l.qty;
                  return (
                    <tr key={l.key}>
                      <td className="px-2 py-1.5">{l.description}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted">{invoicedQty}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max={invoicedQty}
                          value={l.qty}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((x) =>
                                x.key === l.key
                                  ? { ...x, qty: Math.min(Number(e.target.value) || 0, invoicedQty) }
                                  : x,
                              ),
                            )
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted">{l.rate}</td>
                      <td className="px-1 py-1.5 text-center">
                        <button
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          className="text-muted hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Field label="Note">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save} disabled={!reversesDocId}>Issue Credit Note</Button>
      </div>
    </Modal>
  );
}
