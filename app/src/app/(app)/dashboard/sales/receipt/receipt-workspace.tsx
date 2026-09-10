"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Receipt = {
  id: string; number: string; date: string; amount: string;
  paymentMode: string; against: string; reference: string;
};
type Customer = { id: string; name: string };
type Ledger = { id: string; name: string };
type OpenInvoice = { id: string; number: string; customerLedgerId: string; outstanding: string };

export function ReceiptWorkspace({
  receipts,
  customers,
  cashBank,
  openInvoices,
  canCreate,
}: {
  receipts: Receipt[];
  customers: Customer[];
  cashBank: Ledger[];
  openInvoices: OpenInvoice[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Receipts"]}
        title="Receipts"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Receipt
            </Button>
          )
        }
      />
      {receipts.length === 0 ? (
        <EmptyState title="No receipts yet" hint="Record a customer payment." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Receipt No.</th>
                <th className="px-4 py-2 font-medium">Against</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receipts.map((r) => (
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
        <ReceiptForm
          customers={customers}
          cashBank={cashBank}
          openInvoices={openInvoices}
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

function ReceiptForm({
  customers,
  cashBank,
  openInvoices,
  onClose,
  onSaved,
}: {
  customers: Customer[];
  cashBank: Ledger[];
  openInvoices: OpenInvoice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [customerLedgerId, setCustomerId] = useState("");
  const [againstDocId, setAgainst] = useState("");
  const [paymentLedgerId, setPaymentLedger] = useState(cashBank[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMode, setMode] = useState<"CASH" | "BANK" | "CHEQUE" | "WALLET">("CASH");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const invoicesForCustomer = useMemo(
    () => openInvoices.filter((i) => !customerLedgerId || i.customerLedgerId === customerLedgerId),
    [openInvoices, customerLedgerId],
  );
  const selectedInvoice = openInvoices.find((i) => i.id === againstDocId);

  async function save() {
    if (!customerLedgerId) return toast("Select a customer", "err");
    setSaving(true);
    const res = await api<{ receipt: { number: string } }>("/api/sales/receipts", {
      method: "POST",
      body: JSON.stringify({
        date, customerLedgerId, paymentLedgerId,
        againstDocId: againstDocId || undefined,
        amount: Number(amount), paymentMode, reference: reference || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Receipt ${res.data.receipt.number} recorded`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Receipt">
      <div className="space-y-3">
        <Field label="Customer" required>
          <select
            value={customerLedgerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setAgainst("");
            }}
            className={inputClass}
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Against invoice" hint="Leave blank for an on-account payment">
          <select value={againstDocId} onChange={(e) => {
            setAgainst(e.target.value);
            const inv = openInvoices.find((i) => i.id === e.target.value);
            if (inv) setAmount(inv.outstanding);
          }} className={inputClass}>
            <option value="">On account</option>
            {invoicesForCustomer.map((i) => (
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
          <Field label="Deposit to" required>
            <select value={paymentLedgerId} onChange={(e) => setPaymentLedger(e.target.value)} className={inputClass}>
              {cashBank.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque no. / txn id" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} disabled={!customerLedgerId || !amount}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
