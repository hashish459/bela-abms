"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, Card, Field, Input, PageHeader, Toggle, toast } from "@/components/ui";

type Info = {
  legalName: string;
  displayName: string | null;
  phone: string;
  phone2: string | null;
  email: string;
  website: string | null;
  panNumber: string;
  eximCode: string | null;
  cbmsUsername: string | null;
  cbmsPasswordSet: boolean;
  registeredWithVat: boolean;
  separatePurchaseSalesTax: boolean;
  syncWithIrd: boolean;
  registeredAddress: string;
  registeredAddress2: string | null;
} | null;

const EMPTY = {
  legalName: "", displayName: "", phone: "", phone2: "", email: "", website: "",
  panNumber: "", eximCode: "", cbmsUsername: "", registeredAddress: "", registeredAddress2: "",
};

export function CompanyInfoForm({
  initial,
  canEdit,
}: {
  initial: Info;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    ...EMPTY,
    ...(initial
      ? {
          legalName: initial.legalName,
          displayName: initial.displayName ?? "",
          phone: initial.phone,
          phone2: initial.phone2 ?? "",
          email: initial.email,
          website: initial.website ?? "",
          panNumber: initial.panNumber,
          eximCode: initial.eximCode ?? "",
          cbmsUsername: initial.cbmsUsername ?? "",
          registeredAddress: initial.registeredAddress,
          registeredAddress2: initial.registeredAddress2 ?? "",
        }
      : {}),
  });
  const [cbmsPassword, setCbmsPassword] = useState("");
  const [registeredWithVat, setVat] = useState(initial?.registeredWithVat ?? true);
  const [separateTax, setSepTax] = useState(initial?.separatePurchaseSalesTax ?? false);
  const [syncWithIrd, setSync] = useState(initial?.syncWithIrd ?? false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    const res = await api("/api/settings/company-info", {
      method: "PUT",
      body: JSON.stringify({
        ...f,
        cbmsPassword: cbmsPassword || undefined,
        registeredWithVat,
        separatePurchaseSalesTax: separateTax,
        syncWithIrd,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Company info saved");
    setCbmsPassword("");
    router.refresh();
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Company Info"]} title="Company Info" />

      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Legal identity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal Company Name" required>
              <Input value={f.legalName} onChange={set("legalName")} disabled={!canEdit} />
            </Field>
            <Field label="Display Name">
              <Input value={f.displayName} onChange={set("displayName")} disabled={!canEdit} />
            </Field>
            <Field label="Phone number" required>
              <Input value={f.phone} onChange={set("phone")} disabled={!canEdit} />
            </Field>
            <Field label="Phone number 2">
              <Input value={f.phone2} onChange={set("phone2")} disabled={!canEdit} />
            </Field>
            <Field label="Email Address" required>
              <Input type="email" value={f.email} onChange={set("email")} disabled={!canEdit} />
            </Field>
            <Field label="Website">
              <Input value={f.website} onChange={set("website")} disabled={!canEdit} />
            </Field>
            <Field label="PAN Number" required>
              <Input value={f.panNumber} onChange={set("panNumber")} disabled={!canEdit} />
            </Field>
            <Field label="Exim Code">
              <Input value={f.eximCode} onChange={set("eximCode")} disabled={!canEdit} />
            </Field>
            <Field label="Registered Address" required>
              <Input
                value={f.registeredAddress}
                onChange={set("registeredAddress")}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Registered Address 2">
              <Input
                value={f.registeredAddress2}
                onChange={set("registeredAddress2")}
                disabled={!canEdit}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">IRD / Tax registration</h2>
          <p className="mb-3 text-xs text-muted">
            CBMS integration (real-time invoice sync to IRD) is not active in this release —
            the credentials are stored for when it is enabled. The password is encrypted at
            rest and never shown again.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CBMS Username">
              <Input value={f.cbmsUsername} onChange={set("cbmsUsername")} disabled={!canEdit} />
            </Field>
            <Field
              label="CBMS Password"
              hint={initial?.cbmsPasswordSet ? "A password is set. Leave blank to keep it." : undefined}
            >
              <Input
                type="password"
                value={cbmsPassword}
                onChange={(e) => setCbmsPassword(e.target.value)}
                disabled={!canEdit}
                placeholder="••••••••"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-6">
            <Toggle checked={registeredWithVat} onChange={setVat} label="Registered with VAT" />
            <Toggle
              checked={separateTax}
              onChange={setSepTax}
              label="Separate purchase / sales tax"
            />
            <Toggle checked={syncWithIrd} onChange={setSync} label="Sync With IRD" />
          </div>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
