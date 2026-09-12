"use client";

import { useState } from "react";
import { api, Button, Card, Field, Input, PageHeader, inputClass, toast } from "@/components/ui";

type Footer = {
  termsAndConditions: string | null;
  bankAccountId: string | null;
  authorizedSignatory: string | null;
  footerNote: string | null;
};

export function BillFooterForm({
  initial,
  accounts,
  canUpdate,
}: {
  initial: Footer;
  accounts: { id: string; label: string }[];
  canUpdate: boolean;
}) {
  const [terms, setTerms] = useState(initial.termsAndConditions ?? "");
  const [bankAccountId, setBankAccountId] = useState(initial.bankAccountId ?? "");
  const [signatory, setSignatory] = useState(initial.authorizedSignatory ?? "");
  const [note, setNote] = useState(initial.footerNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api("/api/settings/bill-footer", {
      method: "PUT",
      body: JSON.stringify({ termsAndConditions: terms, bankAccountId, authorizedSignatory: signatory, footerNote: note }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Bill footer saved");
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Bill Footer"]} title="Bill Footer" />
      <p className="mb-3 text-sm text-muted">
        Printed below the totals block on Sales and Purchase invoice detail/print pages.
      </p>

      <Card className="max-w-2xl space-y-4 p-5">
        <Field label="Terms & Conditions" hint="Shown as a small note above the signature line">
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            disabled={!canUpdate}
            rows={4}
            className={inputClass}
            placeholder="Goods once sold will not be taken back. Interest charged on overdue accounts."
          />
        </Field>
        <Field label="Bank account to print" hint="From Settings › Bank Detail">
          <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} disabled={!canUpdate} className={inputClass}>
            <option value="">— None —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Authorized signatory">
          <Input value={signatory} onChange={(e) => setSignatory(e.target.value)} disabled={!canUpdate} placeholder="For Bela Nepal Industries Pvt. Ltd." />
        </Field>
        <Field label="Footer note" hint="One short line, e.g. a thank-you message">
          <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={!canUpdate} placeholder="Thank you for your business." />
        </Field>
        {canUpdate && (
          <div className="flex justify-end pt-2">
            <Button loading={saving} onClick={save}>Save</Button>
          </div>
        )}
      </Card>
    </>
  );
}
