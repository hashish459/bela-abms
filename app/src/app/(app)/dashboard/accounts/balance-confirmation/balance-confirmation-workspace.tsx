"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; asOfDate: string; ledgerName: string; ledgerCode: string;
  balance: string; balanceType: string; status: "PENDING" | "CONFIRMED" | "DISPUTED";
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Account = { id: string; name: string };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-muted", CONFIRMED: "text-success", DISPUTED: "text-danger",
};

export function BalanceConfirmationWorkspace({
  initial, accounts, canCreate, canUpdate,
}: {
  initial: List; accounts: Account[]; canCreate: boolean; canUpdate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function setStatus(id: string, status: string) {
    const res = await api(`/api/accounts/balance-confirmation/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!res.ok) return toast(res.error.message, "err");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Accounts", "Balance Confirmation"]}
        title="Balance Confirmation"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Confirmation</Button>}
      />
      <p className="mb-3 text-xs text-muted">
        A point-in-time balance snapshot sent to a customer or supplier to confirm against
        their own records — standard reconciliation practice. Never repostable; it&apos;s a
        statement about a balance, not a transaction.
      </p>

      {initial.rows.length === 0 ? (
        <EmptyState title="No confirmations yet" hint="Send a customer or supplier their balance to confirm." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">As of</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.asOfDate}</td>
                  <td className="px-4 py-2.5 font-medium">{r.ledgerName} <span className="text-xs text-muted">({r.ledgerCode})</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.balance} {r.balanceType}</td>
                  <td className="px-4 py-2.5">
                    {canUpdate ? (
                      <select
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value)}
                        className={`bg-transparent text-xs font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="DISPUTED">Disputed</option>
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
        <BalanceConfirmationForm
          accounts={accounts}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function BalanceConfirmationForm({
  accounts, onClose, onSaved,
}: {
  accounts: Account[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [ledgerId, setLedgerId] = useState("");
  const [asOfDate, setAsOfDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!ledgerId) return toast("Select an account", "err");
    setSaving(true);
    const res = await api("/api/accounts/balance-confirmation", {
      method: "POST",
      body: JSON.stringify({ ledgerId, asOfDate, notes: notes || undefined }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Balance confirmation created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Balance Confirmation">
      <div className="space-y-3">
        <Field label="Customer / Supplier" required>
          <select value={ledgerId} onChange={(e) => setLedgerId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="As of date (AD)" required hint={`BS ${adToBs(asOfDate)}`}>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </Field>
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
