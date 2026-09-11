"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Payment = { id: string; number: string; date: string; amount: string; paymentMode: string; against: string; reference: string };
type Supplier = { id: string; name: string };
type Ledger = { id: string; name: string };
type OpenInvoice = { id: string; number: string; supplierLedgerId: string; outstanding: string };

export function SupplierPaymentWorkspace({
  payments, suppliers, cashBank, openInvoices, canCreate,
}: {
  payments: Payment[]; suppliers: Supplier[]; cashBank: Ledger[]; openInvoices: OpenInvoice[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Payments"]}
        title="Payments"
        action={canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> New Payment
          </Button>
        )}
      />
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" hint="Record a payment made to a supplier." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Payment No.</th>
                <th className="px-4 py-2 font-medium">Against</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.against}</td>
                  <td className="px-4 py-2.5">{r.paymentMode}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <PaymentForm
          suppliers={suppliers} cashBank={cashBank} openInvoices={openInvoices}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function PaymentForm({
  suppliers, cashBank, openInvoices, onClose, onSaved,
}: {
  suppliers: Supplier[]; cashBank: Ledger[]; openInvoices: OpenInvoice[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [supplierLedgerId, setSupplierId] = useState("");
  const [againstDocId, setAgainst] = useState("");
  const [paymentLedgerId, setPaymentLedger] = useState(cashBank[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMode, setMode] = useState<"CASH" | "BANK" | "CHEQUE" | "WALLET">("CASH");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const invoicesForSupplier = useMemo(
    () => openInvoices.filter((i) => !supplierLedgerId || i.supplierLedgerId === supplierLedgerId),
    [openInvoices, supplierLedgerId],
  );
  const selectedInvoice = openInvoices.find((i) => i.id === againstDocId);

  async function save() {
    if (!supplierLedgerId) return toast("Select a supplier", "err");
    setSaving(true);
    const res = await api<{ payment: { number: string } }>("/api/purchase/payments", {
      method: "POST",
      body: JSON.stringify({
        date, supplierLedgerId, paymentLedgerId, againstDocId: againstDocId || undefined,
        amount: Number(amount), paymentMode, reference: reference || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Payment ${res.data.payment.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Payment">
      <div className="space-y-3">
        <Field label="Supplier" required>
          <select value={supplierLedgerId} onChange={(e) => { setSupplierId(e.target.value); setAgainst(""); }} className={inputClass}>
            <option value="">Select…</option>
            {suppliers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
        <Field label="Against invoice" hint="Leave blank for an on-account payment">
          <select value={againstDocId} onChange={(e) => {
            setAgainst(e.target.value);
            const inv = openInvoices.find((i) => i.id === e.target.value);
            if (inv) setAmount(inv.outstanding);
          }} className={inputClass}>
            <option value="">On account</option>
            {invoicesForSupplier.map((i) => (
              <option key={i.id} value={i.id}>{i.number} — outstanding {i.outstanding}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount" required hint={selectedInvoice ? `Outstanding ${selectedInvoice.outstanding}` : undefined}>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Payment mode" required>
            <select value={paymentMode} onChange={(e) => setMode(e.target.value as typeof paymentMode)} className={inputClass}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CHEQUE">Cheque</option>
              <option value="WALLET">Wallet</option>
            </select>
          </Field>
          <Field label="Paid from" required>
            <select value={paymentLedgerId} onChange={(e) => setPaymentLedger(e.target.value)} className={inputClass}>
              {cashBank.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
          </Field>
        </div>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque no. / txn id" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} disabled={!supplierLedgerId || !amount}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
