"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

const MODULES = ["SALES_INVOICE", "PURCHASE_INVOICE", "JOB_CARD", "PRODUCTION_ORDER"];

type Status = { id: string; module: string; label: string; color: string; isActive: boolean };

export function CustomStatusManager({
  initial, canCreate, canUpdate, canDelete,
}: { initial: Status[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Status | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(st: Status) {
    if (!confirm(`Delete status "${st.label}"?`)) return;
    const res = await api(`/api/settings/custom-status/${st.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Status deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Custom Status"]}
        title="Custom Status"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add status</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        Descriptive labels per module. These are additional tags — Sales/Purchase document
        status stays on its fixed workflow states since GL posting depends on it.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No custom statuses yet" hint="Add a descriptive label for a module." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Module</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((st) => (
                <tr key={st.id}>
                  <td className="px-4 py-2.5 text-xs text-muted">{st.module.replace("_", " ")}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${st.color}22`, color: st.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{st.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(st)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(st)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <StatusForm
          status={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function StatusForm({ status, onClose, onSaved }: { status: Status | null; onClose: () => void; onSaved: () => void }) {
  const [module, setModule] = useState(status?.module ?? MODULES[0]);
  const [label, setLabel] = useState(status?.label ?? "");
  const [color, setColor] = useState(status?.color ?? "#64748b");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!label.trim()) return toast("Label is required", "err");
    setSaving(true);
    const res = await api(status ? `/api/settings/custom-status/${status.id}` : "/api/settings/custom-status", {
      method: status ? "PATCH" : "POST",
      body: JSON.stringify({ module, label, color }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(status ? "Status updated" : "Status added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={status ? "Update status" : "Add status"}>
      <div className="space-y-3">
        <Field label="Module" required>
          <select value={module} onChange={(e) => setModule(e.target.value)} className={inputClass}>
            {MODULES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Label" required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ready for Dispatch" />
        </Field>
        <Field label="Color">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 rounded ring-1 ring-border" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
