"use client";

import { useState } from "react";
import { api, Button, Card, Field, PageHeader, Toggle, inputClass, toast } from "@/components/ui";

type Setting = {
  showHsCode: boolean;
  showDiscountColumn: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
  defaultTermsText: string | null;
  defaultNotes: string | null;
};

export function InvoiceSettingForm({ initial, canUpdate }: { initial: Setting; canUpdate: boolean }) {
  const [showHsCode, setShowHsCode] = useState(initial.showHsCode);
  const [showDiscountColumn, setShowDiscountColumn] = useState(initial.showDiscountColumn);
  const [showBankDetails, setShowBankDetails] = useState(initial.showBankDetails);
  const [showQrCode, setShowQrCode] = useState(initial.showQrCode);
  const [defaultTermsText, setDefaultTermsText] = useState(initial.defaultTermsText ?? "");
  const [defaultNotes, setDefaultNotes] = useState(initial.defaultNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api("/api/settings/invoice-setting", {
      method: "PUT",
      body: JSON.stringify({ showHsCode, showDiscountColumn, showBankDetails, showQrCode, defaultTermsText, defaultNotes }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Invoice setting saved");
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Invoice Setting"]} title="Invoice Setting" />
      <p className="mb-3 text-sm text-muted">
        Controls what appears on the Sales/Purchase invoice detail+print pages, and pre-fills
        new invoices with a default note.
      </p>

      <Card className="max-w-2xl space-y-4 p-5">
        <div className="space-y-3">
          <Toggle checked={showHsCode} onChange={setShowHsCode} label="Show HS Code column" />
          <Toggle checked={showDiscountColumn} onChange={setShowDiscountColumn} label="Show Discount column" />
          <Toggle checked={showBankDetails} onChange={setShowBankDetails} label="Show bank details (from Bill Footer)" />
          <Toggle checked={showQrCode} onChange={setShowQrCode} label="Show payment QR code (from Company Info)" />
        </div>
        <Field label="Default terms text" hint="Pre-fills new invoices; still editable per-invoice">
          <textarea value={defaultTermsText} onChange={(e) => setDefaultTermsText(e.target.value)} disabled={!canUpdate} rows={3} className={inputClass} />
        </Field>
        <Field label="Default notes">
          <textarea value={defaultNotes} onChange={(e) => setDefaultNotes(e.target.value)} disabled={!canUpdate} rows={2} className={inputClass} />
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
