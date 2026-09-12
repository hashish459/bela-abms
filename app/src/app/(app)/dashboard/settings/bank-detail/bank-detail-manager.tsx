"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

type Account = {
  id: string; bankId: string; bankName: string; accountName: string; accountNumber: string;
  branch: string | null; swiftCode: string | null; ledgerId: string | null; isDefault: boolean; isActive: boolean;
};
type Bank = { id: string; name: string };
type Ledger = { id: string; name: string };

export function BankDetailManager({
  initial, banks, ledgers, canCreate, canUpdate, canDelete,
}: {
  initial: Account[]; banks: Bank[]; ledgers: Ledger[];
  canCreate: boolean; canUpdate: boolean; canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(a: Account) {
    if (!confirm(`Delete account "${a.accountName}"?`)) return;
    const res = await api(`/api/settings/bank-accounts/${a.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Bank account deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Bank Detail"]}
        title="Bank Detail"
        action={canCreate && banks.length > 0 && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add account</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        The company&apos;s own bank accounts. The default one is printed on invoices via Bill Footer.
      </p>
      {banks.length === 0 && (
        <Card className="mb-3 p-3 text-sm text-danger">Add a bank in Settings › Banks before registering an account.</Card>
      )}

      {initial.length === 0 ? (
        <EmptyState title="No bank accounts yet" hint="Register the account customers should pay into." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Bank</th>
                <th className="px-4 py-2 font-medium">Account Name</th>
                <th className="px-4 py-2 font-medium">Account No.</th>
                <th className="px-4 py-2 font-medium">Branch</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {a.bankName}
                    {a.isDefault && <Star size={12} className="ml-1.5 inline text-accent" fill="currentColor" />}
                  </td>
                  <td className="px-4 py-2.5">{a.accountName}</td>
                  <td className="px-4 py-2.5 tabular-nums">{a.accountNumber}</td>
                  <td className="px-4 py-2.5 text-muted">{a.branch ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(a)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(a)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <AccountForm
          account={editing}
          banks={banks}
          ledgers={ledgers}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function AccountForm({
  account, banks, ledgers, onClose, onSaved,
}: {
  account: Account | null; banks: Bank[]; ledgers: Ledger[]; onClose: () => void; onSaved: () => void;
}) {
  const [bankId, setBankId] = useState(account?.bankId ?? banks[0]?.id ?? "");
  const [accountName, setAccountName] = useState(account?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [branch, setBranch] = useState(account?.branch ?? "");
  const [swiftCode, setSwiftCode] = useState(account?.swiftCode ?? "");
  const [ledgerId, setLedgerId] = useState(account?.ledgerId ?? "");
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!bankId || !accountName.trim() || !accountNumber.trim())
      return toast("Bank, account name and account number are required", "err");
    setSaving(true);
    const payload = { bankId, accountName, accountNumber, branch, swiftCode, ledgerId, isDefault };
    const res = await api(
      account ? `/api/settings/bank-accounts/${account.id}` : "/api/settings/bank-accounts",
      { method: account ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(account ? "Account updated" : "Account added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={account ? "Update bank account" : "Add bank account"} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bank" required>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)} className={inputClass}>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Account name" required>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Bela Nepal Industries Pvt. Ltd." />
        </Field>
        <Field label="Account number" required>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </Field>
        <Field label="Branch">
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
        <Field label="SWIFT code">
          <Input value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} />
        </Field>
        <Field label="Linked GL ledger" hint="Optional — ties this account to a cash/bank ledger">
          <select value={ledgerId} onChange={(e) => setLedgerId(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {ledgers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Default account (printed on invoices)
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
