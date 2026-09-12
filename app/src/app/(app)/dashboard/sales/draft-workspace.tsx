"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import {
  SalesLineEditor, newLine, type EditorLine, type TaxOpt, type Totals,
} from "@/components/sales-line-editor";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; customer: string; grandTotal: string; status: string;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Customer = { id: string; name: string; pan: string | null };

export function DraftWorkspace({
  kind,
  title,
  endpoint,
  initial,
  customers,
  taxRates,
  canCreate,
  hasFiscalYear,
}: {
  kind: "QUOTATION" | "SALES_ORDER" | "PROFORMA_INVOICE";
  title: string;
  endpoint: string; // "/api/sales/quotations"
  initial: List;
  customers: Customer[];
  taxRates: TaxOpt[];
  canCreate: boolean;
  hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function convert(id: string, toType: "SALES_ORDER" | "INVOICE") {
    const res = await api(`/api/sales/docs/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({ toType }),
    });
    if (!res.ok) return toast(res.error.message, "err");
    toast(
      toType === "INVOICE"
        ? "Opening a new invoice with these items — fill payment details and save."
        : "Converted to Sales Order.",
    );
    if (toType === "INVOICE") router.push("/dashboard/sales/invoice");
    else router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Sales", title]}
        title={title}
        action={
          canCreate &&
          hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New {title}
            </Button>
          )
        }
      />
      {initial.rows.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}s`} hint={`A ${title.toLowerCase()} does not affect stock or the ledger until converted to an invoice.`} />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
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
                  <td className="px-4 py-2.5">{d.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.grandTotal}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{d.status}</td>
                  <td className="px-4 py-2.5 text-right">
                    {d.status !== "CONVERTED" && (
                      <div className="flex justify-end gap-1">
                        {kind === "QUOTATION" && (
                          <Button variant="ghost" onClick={() => convert(d.id, "SALES_ORDER")}>
                            → Order
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => convert(d.id, "INVOICE")}>
                          <ArrowRight size={13} /> Invoice
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <DraftForm
          title={title}
          endpoint={endpoint}
          customers={customers}
          taxRates={taxRates}
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

function DraftForm({
  title,
  endpoint,
  customers,
  taxRates,
  onClose,
  onSaved,
}: {
  title: string;
  endpoint: string;
  customers: Customer[];
  taxRates: TaxOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [customerLedgerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<EditorLine[]>([newLine()]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const payloadLines = lines
      .filter((l) => (Number(l.qty) || 0) > 0 && (l.product || l.description))
      .map((l) => ({
        productId: l.product?.id || undefined,
        description: l.description || l.product?.name || "Item",
        hsCode: l.hsCode || undefined,
        qty: Number(l.qty),
        rate: Number(l.rate) || 0,
        discount: Number(l.discount) || 0,
        taxRateId: l.taxRateId || undefined,
        isNonTaxable: !l.taxRateId,
      }));
    if (payloadLines.length === 0) return toast("Add at least one line item", "err");
    if (!customerLedgerId && !customerName) return toast("Select a customer or enter a name", "err");

    setSaving(true);
    const res = await api<{ doc: { number: string } }>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        date,
        customerLedgerId: customerLedgerId || undefined,
        customerName: customerLedgerId ? undefined : customerName,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
        invoiceDiscount: Number(invoiceDiscount) || 0,
        lines: payloadLines,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`${title} ${res.data.doc.number} created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`New ${title}`} wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Account name" required>
            <select value={customerLedgerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">— Enter a name —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
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
          <Field label="Reference">
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </Field>
        </div>

        <SalesLineEditor
          lines={lines}
          setLines={setLines}
          taxRates={taxRates}
          invoiceDiscount={invoiceDiscount}
          setInvoiceDiscount={setInvoiceDiscount}
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
