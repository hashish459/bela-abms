"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";

type Cat = {
  id: string; name: string; parentId: string | null; description: string | null;
  isActive: boolean; productCount: number;
};

export function CategoryManager({
  initial,
  canCreate,
  canUpdate,
  canDelete,
}: {
  initial: Cat[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Cat | null>(null);
  const [creating, setCreating] = useState(false);

  const nameById = new Map(initial.map((c) => [c.id, c.name]));

  async function remove(c: Cat) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const res = await api(`/api/inventory/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Category deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Product Category"]}
        title="Product Category"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add category
            </Button>
          )
        }
      />
      {initial.length === 0 ? (
        <EmptyState title="No categories yet" hint="Group your products for faster search and reporting." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Parent</th>
                <th className="px-4 py-2 font-medium">Products</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {c.parentId ? nameById.get(c.parentId) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-2.5">{c.productCount}</td>
                  <td className="px-4 py-2.5 text-muted">{c.description || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button variant="ghost" onClick={() => setEditing(c)}>
                          <Pencil size={14} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" onClick={() => remove(c)}>
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
      )}

      {(creating || editing) && (
        <CategoryForm
          cat={editing}
          all={initial}
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

function CategoryForm({
  cat,
  all,
  onClose,
  onSaved,
}: {
  cat: Cat | null;
  all: Cat[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cat?.name ?? "");
  const [parentId, setParentId] = useState(cat?.parentId ?? "");
  const [description, setDescription] = useState(cat?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(
      cat ? `/api/inventory/categories/${cat.id}` : "/api/inventory/categories",
      { method: cat ? "PATCH" : "POST", body: JSON.stringify({ name, parentId, description }) },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(cat ? "Category updated" : "Category created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={cat ? "Update category" : "Add category"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Beverages" />
        </Field>
        <Field label="Under category">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={inputClass}
          >
            <option value="">Top level</option>
            {all.filter((c) => c.id !== cat?.id).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!name}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
