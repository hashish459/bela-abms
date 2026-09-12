"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import {
  PurchaseLineEditor, newPurchaseLine, type PurchaseEditorLine, type PurchaseTotals,
} from "@/components/purchase-line-editor";
import type { TaxOpt } from "@/components/sales-line-editor";
import { CustomFieldsFields } from "@/components/custom-fields-fields";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; supplier: string; supplierInvoiceNumber: string;
  excise: string; custom: string; taxable: string; vat: string; grandTotal: string;
  outstanding: string; status: string;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Supplier = { id: string; name: string; pan: string | null };
type Ledger = { id: string; name: string; code: string };

const STATUS_STYLE: Record<string, string> = {
  PAID: "text-success", OPEN: "text-accent", PARTIALLY_PAID: "text-accent",
  RETURNED: "text-muted", CANCELLED: "text-danger line-through",
};

export function PurchaseInvoiceWorkspace({
  initial, suppliers, taxRates, cashBank, canCreate, hasFiscalYear,
}: {
  initial: List; suppliers: Supplier[]; taxRates: TaxOpt[]; cashBank: Ledger[];
  canCreate: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Purchase Invoice"]}
        title="Purchase Invoice"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Purchase Invoice
            </Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before recording purchases.
        </Card>
      )}
      <p className="mb-3 text-xs text-muted">
        Purchase invoices are permanent records — once created they cannot be edited or
        deleted. Use a Debit Note to reverse one.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No purchase invoices yet" hint="Record your first purchase bill." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Invoice No.</th>
                <th className="px-4 py-2 font-medium">Supplier Bill</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 text-right font-medium">VAT</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/dashboard/purchase/purchase-bills/${d.id}`)}
                  className="cursor-pointer hover:bg-accent-tint"
                >
                  <td className="px-4 py-2.5">{d.date}</td>
                  <td className="px-4 py-2.5 font-medium">{d.number}</td>
                  <td className="px-4 py-2.5 text-muted">{d.supplierInvoiceNumber}</td>
                  <td className="px-4 py-2.5">{d.supplier}</td>
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
        <PurchaseInvoiceForm
          suppliers={suppliers}
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

function PurchaseInvoiceForm({
  suppliers, taxRates, cashBank, onClose, onSaved,
}: {
  suppliers: Supplier[]; taxRates: TaxOpt[]; cashBank: Ledger[];
  onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [supplierLedgerId, setSupplierId] = useState("");
  const [supplierInvoiceNumber, setSupplierInvNo] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CREDIT" | "CASH" | "BANK" | "CHEQUE" | "WALLET">("CREDIT");
  const [paymentLedgerId, setPaymentLedgerId] = useState(cashBank[0]?.id ?? "");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<PurchaseEditorLine[]>([newPurchaseLine()]);
  const [totals, setTotals] = useState<PurchaseTotals | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isCash = paymentMode !== "CREDIT";

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
        batchNo: l.batchNo || undefined, expiryDate: l.expiryDate || undefined,
      }));
    if (!supplierLedgerId) return toast("Select a supplier", "err");
    if (!supplierInvoiceNumber) return toast("Enter the supplier's invoice number", "err");
    if (payloadLines.length === 0) return toast("Add at least one line item", "err");
    if (isCash && !paymentLedgerId) return toast("Select the account paid from", "err");

    setSaving(true);
    const res = await api<{ invoice: { number: string } }>("/api/purchase/invoices", {
      method: "POST",
      body: JSON.stringify({
        date, supplierLedgerId, supplierInvoiceNumber, paymentMode,
        paymentLedgerId: isCash ? paymentLedgerId : undefined,
        referenceNo: referenceNo || undefined, notes: notes || undefined,
        invoiceDiscount: Number(invoiceDiscount) || 0, lines: payloadLines,
        customFields,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Purchase invoice ${res.data.invoice.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Purchase Invoice" wide>
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
          <Field label="Supplier Invoice Number" required>
            <Input value={supplierInvoiceNumber} onChange={(e) => setSupplierInvNo(e.target.value)} />
          </Field>
          <Field label="Invoice date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Payment mode" required>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputClass}>
              <option value="CREDIT">Credit</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="WALLET">Wallet</option>
            </select>
          </Field>
          {isCash && (
            <Field label="Paid from" required>
              <select value={paymentLedgerId} onChange={(e) => setPaymentLedgerId(e.target.value)} className={inputClass}>
                {cashBank.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          )}
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

        <CustomFieldsFields
          module="PURCHASE_INVOICE"
          values={customFields}
          onChange={(id, v) => setCustomFields((s) => ({ ...s, [id]: v }))}
        />
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
