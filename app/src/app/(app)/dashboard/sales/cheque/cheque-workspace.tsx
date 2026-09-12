"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; chequeNo: string; bankName: string; chequeDate: string; amount: string;
  customer: string; status: "PENDING" | "DEPOSITED" | "CLEARED" | "BOUNCED"; invoiceNumber: string | null;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Customer = { id: string; name: string };
type InvoiceOpt = { id: string; label: string };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-muted",
  DEPOSITED: "text-accent",
  CLEARED: "text-success",
  BOUNCED: "text-danger",
};

export function ChequeWorkspace({
  initial, customers, recentInvoices, canCreate, canUpdate,
}: {
  initial: List; customers: Customer[]; recentInvoices: InvoiceOpt[]; canCreate: boolean; canUpdate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function setStatus(id: string, status: string) {
    const res = await api(`/api/sales/cheque/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!res.ok) return toast(res.error.message, "err");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Cheque"]}
        title="Cheque"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Cheque</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        Post-dated cheque register — tracks the instrument and its clearance status.
        Doesn&apos;t re-post the payment; the invoice or receipt already recorded that.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No cheques recorded" hint="Track a customer's post-dated cheque." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Cheque Date</th>
                <th className="px-4 py-2 font-medium">Cheque No.</th>
                <th className="px-4 py-2 font-medium">Bank</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.chequeDate}</td>
                  <td className="px-4 py-2.5 font-medium">{r.chequeNo}</td>
                  <td className="px-4 py-2.5">{r.bankName}</td>
                  <td className="px-4 py-2.5">{r.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">Rs. {r.amount}</td>
                  <td className="px-4 py-2.5 text-muted">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {canUpdate ? (
                      <select
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value)}
                        className={`bg-transparent text-xs font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="DEPOSITED">Deposited</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="BOUNCED">Bounced</option>
                      </select>
                    ) : (
                      <span className={`text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <ChequeForm
          customers={customers}
          recentInvoices={recentInvoices}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function ChequeForm({
  customers, recentInvoices, onClose, onSaved,
}: {
  customers: Customer[]; recentInvoices: InvoiceOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeDate, setChequeDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [customerLedgerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [salesDocId, setSalesDocId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!chequeNo || !bankName) return toast("Cheque number and bank are required", "err");
    if (!(Number(amount) > 0)) return toast("Enter a valid amount", "err");
    if (!customerLedgerId && !customerName) return toast("Select a customer or enter a name", "err");

    setSaving(true);
    const res = await api("/api/sales/cheque", {
      method: "POST",
      body: JSON.stringify({
        chequeNo, bankName, chequeDate, amount: Number(amount),
        customerLedgerId: customerLedgerId || undefined,
        customerName: customerLedgerId ? undefined : customerName,
        salesDocId: salesDocId || undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Cheque recorded");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Cheque">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cheque no." required>
            <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
          </Field>
          <Field label="Bank name" required>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </Field>
          <Field label="Cheque date (AD)" required hint={`BS ${adToBs(chequeDate)}`}>
            <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
          </Field>
          <Field label="Amount" required>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
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
          <Field label="Against invoice" hint="Optional">
            <select value={salesDocId} onChange={(e) => setSalesDocId(e.target.value)} className={inputClass}>
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
