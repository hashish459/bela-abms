"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import {
  SalesLineEditor, newLine, type EditorLine, type TaxOpt, type Totals,
} from "@/components/sales-line-editor";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; customer: string; reference: string;
  nonTaxable: string; taxable: string; vat: string; grandTotal: string;
  outstanding: string; status: string;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Customer = { id: string; name: string; pan: string | null };
type Ledger = { id: string; name: string; code: string };

const STATUS_STYLE: Record<string, string> = {
  PAID: "text-success",
  OPEN: "text-accent",
  PARTIALLY_PAID: "text-accent",
  RETURNED: "text-muted",
  CANCELLED: "text-danger line-through",
};

export function InvoiceWorkspace({
  initial,
  customers,
  taxRates,
  cashBank,
  canCreate,
  hasFiscalYear,
}: {
  initial: List;
  customers: Customer[];
  taxRates: TaxOpt[];
  cashBank: Ledger[];
  canCreate: boolean;
  hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Sales Invoice"]}
        title="Sales Invoice"
        action={
          canCreate &&
          hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Invoice
            </Button>
          )
        }
      />

      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before invoicing.
        </Card>
      )}

      <p className="mb-3 text-xs text-muted">
        Invoices are permanent records — once created they cannot be edited or deleted.
        Use a Credit Note to reverse one.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Create your first sales invoice." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Invoice No.</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Taxable</th>
                <th className="px-4 py-2 text-right font-medium">VAT</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2 font-medium">Status</th>
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
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.outstanding}</td>
                  <td className={`px-4 py-2.5 text-xs font-medium ${STATUS_STYLE[d.status] ?? ""}`}>
                    {d.status.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <InvoiceForm
          customers={customers}
          taxRates={taxRates}
          cashBank={cashBank}
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

function InvoiceForm({
  customers,
  taxRates,
  cashBank,
  onClose,
  onSaved,
}: {
  customers: Customer[];
  taxRates: TaxOpt[];
  cashBank: Ledger[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [customerLedgerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CREDIT" | "CASH" | "BANK" | "CHEQUE" | "WALLET">("CREDIT");
  const [paymentLedgerId, setPaymentLedgerId] = useState(cashBank[0]?.id ?? "");
  const [creditDays, setCreditDays] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<EditorLine[]>([newLine()]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [saving, setSaving] = useState(false);

  const isCash = paymentMode !== "CREDIT";
  const cust = customers.find((c) => c.id === customerLedgerId);

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
    if (paymentMode === "CREDIT" && !customerLedgerId)
      return toast("Credit sales need a registered customer", "err");
    if (isCash && !paymentLedgerId) return toast("Select the account that received payment", "err");

    setSaving(true);
    const res = await api<{ invoice: { number: string } }>("/api/sales/invoices", {
      method: "POST",
      body: JSON.stringify({
        date,
        customerLedgerId: customerLedgerId || undefined,
        customerName: customerLedgerId ? undefined : customerName || "Cash sale",
        paymentMode,
        paymentLedgerId: isCash ? paymentLedgerId : undefined,
        creditDays: creditDays ? Number(creditDays) : undefined,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
        invoiceDiscount: Number(invoiceDiscount) || 0,
        lines: payloadLines,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Invoice ${res.data.invoice.number} created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Invoice" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Account name" required>
            <select value={customerLedgerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">— Cash / walk-in —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          {!customerLedgerId ? (
            <Field label="Customer name">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" />
            </Field>
          ) : (
            <Field label="PAN">
              <Input value={cust?.pan ?? ""} disabled />
            </Field>
          )}
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Payment mode" required>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputClass}>
              <option value="CREDIT">Credit</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Deposit</option>
              <option value="CHEQUE">Cheque</option>
              <option value="WALLET">Wallet (eSewa / Khalti)</option>
            </select>
          </Field>
          {isCash && (
            <Field label="Received in" required>
              <select value={paymentLedgerId} onChange={(e) => setPaymentLedgerId(e.target.value)} className={inputClass}>
                {cashBank.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          )}
          {paymentMode === "CREDIT" && (
            <Field label="Credit days limit">
              <Input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="e.g. 30" />
            </Field>
          )}
          <Field label="Invoice reference no">
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

        <Field label="Note (appears on print)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted">
          Grand Total <strong className="text-foreground">Rs. {totals?.grandTotal ?? "0.00"}</strong>
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>
            <Printer size={14} /> Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
