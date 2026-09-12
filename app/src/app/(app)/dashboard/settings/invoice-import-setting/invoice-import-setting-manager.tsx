"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Star, X } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

const TARGET_FIELDS = [
  "date", "customerName", "customerPan", "referenceNo", "productName", "hsCode",
  "qty", "rate", "discount", "taxRatePct", "notes",
];

type Template = { id: string; name: string; columnMap: Record<string, string>; isDefault: boolean };

export function InvoiceImportSettingManager({
  initial, canCreate, canUpdate, canDelete,
}: { initial: Template[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const res = await api(`/api/settings/invoice-import-templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Template deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Invoice Import Setting"]}
        title="Invoice Import Setting"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add template</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        Column-mapping templates for bulk invoice CSV import. This defines the mapping only —
        the upload-and-create pipeline that reads a CSV file is a follow-on feature.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No import templates yet" hint="Define how your CSV columns map to invoice fields." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Mapped columns</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {t.name}
                    {t.isDefault && <Star size={12} className="ml-1.5 inline text-accent" fill="currentColor" />}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {Object.keys(t.columnMap).length} {Object.keys(t.columnMap).length === 1 ? "column" : "columns"} mapped
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(t)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(t)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <TemplateForm
          template={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function TemplateForm({ template, onClose, onSaved }: { template: Template | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [rows, setRows] = useState<{ column: string; field: string }[]>(
    template ? Object.entries(template.columnMap).map(([column, field]) => ({ column, field })) : [{ column: "", field: TARGET_FIELDS[0] }],
  );
  const [saving, setSaving] = useState(false);

  function setRow(i: number, patch: Partial<{ column: string; field: string }>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!name.trim()) return toast("Name is required", "err");
    const columnMap = Object.fromEntries(rows.filter((r) => r.column.trim()).map((r) => [r.column.trim(), r.field]));
    if (Object.keys(columnMap).length === 0) return toast("Map at least one column", "err");
    setSaving(true);
    const res = await api(
      template ? `/api/settings/invoice-import-templates/${template.id}` : "/api/settings/invoice-import-templates",
      { method: template ? "PATCH" : "POST", body: JSON.stringify({ name, columnMap, isDefault }) },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(template ? "Template updated" : "Template added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={template ? "Update template" : "Add template"} wide>
      <div className="space-y-3">
        <Field label="Template name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Default CSV format" />
        </Field>

        <div>
          <label className="mb-1 block text-sm font-medium">Column mapping</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={r.column} onChange={(e) => setRow(i, { column: e.target.value })} placeholder="CSV column header" className="flex-1" />
                <span className="text-xs text-muted">→</span>
                <select value={r.field} onChange={(e) => setRow(i, { field: e.target.value })} className={`${inputClass} flex-1`}>
                  {TARGET_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-muted hover:text-danger">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-2" onClick={() => setRows((rs) => [...rs, { column: "", field: TARGET_FIELDS[0] }])}>
            <Plus size={13} /> Add row
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Default template
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
