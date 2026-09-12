"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

const MODULES = ["SALES_INVOICE", "PURCHASE_INVOICE", "PRODUCT", "CONTACT", "JOB_CARD"];
const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"] as const;

type CustomField = {
  id: string; module: string; label: string; fieldType: string;
  options: string[]; required: boolean; isActive: boolean;
};

export function CustomFieldsManager({
  initial, canCreate, canUpdate, canDelete,
}: { initial: CustomField[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(f: CustomField) {
    if (!confirm(`Delete field "${f.label}"?`)) return;
    const res = await api(`/api/settings/custom-fields/${f.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Field deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Custom Fields"]}
        title="Custom Fields"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add field</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        User-definable fields per module. Definitions only for now — entry forms don&apos;t yet
        render these dynamically (tracked as a follow-on).
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No custom fields yet" hint="Define an extra field a module should capture." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Module</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Required</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2.5 text-xs text-muted">{f.module.replace("_", " ")}</td>
                  <td className="px-4 py-2.5 font-medium">{f.label}</td>
                  <td className="px-4 py-2.5">{f.fieldType}</td>
                  <td className="px-4 py-2.5">{f.required ? "Yes" : "—"}</td>
                  <td className="px-4 py-2.5">{f.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(f)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(f)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <FieldForm
          field={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function FieldForm({ field, onClose, onSaved }: { field: CustomField | null; onClose: () => void; onSaved: () => void }) {
  const [module, setModule] = useState(field?.module ?? MODULES[0]);
  const [label, setLabel] = useState(field?.label ?? "");
  const [fieldType, setFieldType] = useState<(typeof FIELD_TYPES)[number]>(
    (field?.fieldType as (typeof FIELD_TYPES)[number]) ?? "TEXT",
  );
  const [options, setOptions] = useState(field?.options.join(", ") ?? "");
  const [required, setRequired] = useState(field?.required ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!label.trim()) return toast("Label is required", "err");
    setSaving(true);
    const payload = {
      module, label, fieldType, required,
      options: fieldType === "SELECT" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
    };
    const res = await api(field ? `/api/settings/custom-fields/${field.id}` : "/api/settings/custom-fields", {
      method: field ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(field ? "Field updated" : "Field added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={field ? "Update field" : "Add field"}>
      <div className="space-y-3">
        <Field label="Module" required>
          <select value={module} onChange={(e) => setModule(e.target.value)} className={inputClass}>
            {MODULES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Label" required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Delivery Instructions" />
        </Field>
        <Field label="Field type" required>
          <select value={fieldType} onChange={(e) => setFieldType(e.target.value as typeof fieldType)} className={inputClass}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        {fieldType === "SELECT" && (
          <Field label="Options" hint="Comma-separated">
            <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Small, Medium, Large" />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
