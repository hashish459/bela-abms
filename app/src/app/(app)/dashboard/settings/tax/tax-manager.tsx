"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, toast,
} from "@/components/ui";

type Tax = {
  id: string;
  name: string;
  ratePct: number;
  isNoTax: boolean;
  isSystem: boolean;
  isActive: boolean;
};

export function TaxManager({
  initial,
  canCreate,
  canUpdate,
  canDelete,
}: {
  initial: Tax[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Tax | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(t: Tax) {
    if (!confirm(`Delete tax "${t.name}"?`)) return;
    const res = await api(`/api/settings/tax-rates/${t.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Tax deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Tax"]}
        title="Tax"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add tax
            </Button>
          )
        }
      />
      <p className="mb-3 text-sm text-muted">
        Tax rates applied to products and invoice lines. Nepal standard VAT is 13%. System
        rates cannot be renamed or deleted.
      </p>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">No Tax</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5 font-medium">
                  {t.name}
                  {t.isSystem && (
                    <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                      system
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">{t.ratePct}%</td>
                <td className="px-4 py-2.5">{t.isNoTax ? "Yes" : "—"}</td>
                <td className="px-4 py-2.5">
                  {t.isActive ? (
                    <span className="text-success">Active</span>
                  ) : (
                    <span className="text-muted">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    {canUpdate && (
                      <Button variant="ghost" onClick={() => setEditing(t)}>
                        <Pencil size={14} />
                      </Button>
                    )}
                    {canDelete && !t.isSystem && (
                      <Button variant="ghost" onClick={() => remove(t)}>
                        <Trash2 size={14} className="text-danger" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {(creating || editing) && (
        <TaxForm
          tax={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function TaxForm({
  tax,
  onClose,
  onSaved,
}: {
  tax: Tax | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tax?.name ?? "");
  const [ratePct, setRatePct] = useState(String(tax?.ratePct ?? ""));
  const [isNoTax, setIsNoTax] = useState(tax?.isNoTax ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(
      tax ? `/api/settings/tax-rates/${tax.id}` : "/api/settings/tax-rates",
      {
        method: tax ? "PATCH" : "POST",
        body: JSON.stringify({ name, ratePct: Number(ratePct), isNoTax }),
      },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(tax ? "Tax updated" : "Tax added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={tax ? "Update tax" : "Add tax"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={tax?.isSystem}
            placeholder="VAT 13%"
          />
        </Field>
        <Field label="Rate (in %)" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isNoTax}
            onChange={(e) => setIsNoTax(e.target.checked)}
          />
          No Tax (excluded from VAT base)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
