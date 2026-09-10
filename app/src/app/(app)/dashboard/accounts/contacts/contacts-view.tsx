"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";

type Contact = {
  id: string; code: string; name: string; panNumber: string | null;
  phone: string | null; email: string | null; address: string | null;
  creditLimit: string | null; openingBalance: string; openingType: string;
};

export function ContactsView({
  customers,
  suppliers,
  canCreate,
}: {
  customers: Contact[];
  suppliers: Contact[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [creating, setCreating] = useState(false);
  const rows = tab === "CUSTOMER" ? customers : suppliers;

  return (
    <>
      <PageHeader
        crumbs={["Accounts", "Contacts"]}
        title="Contacts"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Contact
            </Button>
          )
        }
      />

      <div className="mb-3 inline-flex rounded-lg bg-background p-1 ring-1 ring-border">
        {(["CUSTOMER", "SUPPLIER"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              tab === t ? "bg-surface shadow-sm" : "text-muted"
            }`}
          >
            {t === "CUSTOMER" ? "Customers" : "Suppliers"} ({t === "CUSTOMER" ? customers.length : suppliers.length})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">PAN</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 text-right font-medium">Opening</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No {tab.toLowerCase()}s yet.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-accent-tint">
                <td className="px-4 py-2.5 font-medium">
                  {c.name}
                  <span className="ml-2 text-xs text-muted">{c.code}</span>
                </td>
                <td className="px-4 py-2.5 text-muted">{c.panNumber || "—"}</td>
                <td className="px-4 py-2.5 text-muted">{c.phone || "—"}</td>
                <td className="px-4 py-2.5 text-muted">{c.email || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {c.openingBalance} {c.openingType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {creating && (
        <ContactForm
          defaultKind={tab}
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

function ContactForm({
  defaultKind,
  onClose,
  onSaved,
}: {
  defaultKind: "CUSTOMER" | "SUPPLIER";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<"CUSTOMER" | "SUPPLIER" | "BOTH">(defaultKind);
  const [f, setF] = useState({
    name: "", phone: "", email: "", address: "", panNumber: "", iecNo: "", gstin: "",
    bankName: "", bankAccount: "", creditLimit: "", openingBalance: "0",
  });
  const [openingType, setOpeningType] = useState<"DR" | "CR">("DR");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    const res = await api("/api/accounts/contacts", {
      method: "POST",
      body: JSON.stringify({
        ...f,
        contactKind: kind,
        creditLimit: f.creditLimit ? Number(f.creditLimit) : undefined,
        openingBalance: Number(f.openingBalance) || 0,
        openingType,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Contact created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Contact" wide>
      <div className="space-y-3">
        <div className="inline-flex rounded-lg bg-background p-1 ring-1 ring-border">
          {(["CUSTOMER", "SUPPLIER", "BOTH"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1 text-sm ${
                kind === k ? "bg-surface font-medium shadow-sm" : "text-muted"
              }`}
            >
              {k[0] + k.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={f.name} onChange={set("name")} />
          </Field>
          <Field label="Phone no.">
            <Input value={f.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email">
            <Input type="email" value={f.email} onChange={set("email")} />
          </Field>
          <Field label="PAN">
            <Input value={f.panNumber} onChange={set("panNumber")} />
          </Field>
          <Field label="Address">
            <Input value={f.address} onChange={set("address")} />
          </Field>
          <Field label="Credit Limit">
            <Input type="number" step="0.01" value={f.creditLimit} onChange={set("creditLimit")} />
          </Field>
          <Field label="IEC No.">
            <Input value={f.iecNo} onChange={set("iecNo")} />
          </Field>
          <Field label="GSTIN">
            <Input value={f.gstin} onChange={set("gstin")} />
          </Field>
          <Field label="Bank Name">
            <Input value={f.bankName} onChange={set("bankName")} />
          </Field>
          <Field label="Bank Account No.">
            <Input value={f.bankAccount} onChange={set("bankAccount")} />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Opening Balance">
            <Input
              type="number"
              step="0.01"
              value={f.openingBalance}
              onChange={set("openingBalance")}
            />
          </Field>
          <Field label="Dr/Cr">
            <select
              value={openingType}
              onChange={(e) => setOpeningType(e.target.value as "DR" | "CR")}
              className={inputClass}
            >
              <option value="DR">DR</option>
              <option value="CR">CR</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!f.name}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
