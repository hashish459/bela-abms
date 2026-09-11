"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

type Component = { id: string; componentProductId: string; componentName: string; qtyPerBatch: string; unit: string };
type Bom = {
  id: string; name: string; isActive: boolean; outputProductId: string; outputProductName: string;
  outputQty: string; outputUnit: string; laborCostPerBatch: string; components: Component[];
};
type ProductOpt = { id: string; name: string; unit: string };

export function BomWorkspace({
  initial, finishedGoods, rawMaterials, canCreate,
}: {
  initial: Bom[]; finishedGoods: ProductOpt[]; rawMaterials: ProductOpt[]; canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Manufacturing", "Bill of Materials"]}
        title="Bill of Materials"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)} disabled={!finishedGoods.length || !rawMaterials.length}>
              <Plus size={15} /> New BOM
            </Button>
          )
        }
      />
      {(!finishedGoods.length || !rawMaterials.length) && (
        <Card className="mb-3 p-3 text-sm text-danger">
          You need at least one Finished Goods product and one Raw Material product before
          building a BOM — set a product&apos;s Inventory Role under Inventory › Products.
        </Card>
      )}

      {initial.length === 0 ? (
        <EmptyState title="No bills of material yet" hint="Define what raw materials go into each finished product." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {initial.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="border-b border-border bg-background px-4 py-2.5">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-xs text-muted">
                  Produces {b.outputQty} {b.outputUnit} of <strong>{b.outputProductName}</strong>
                  {Number(b.laborCostPerBatch) > 0 && <> · labor Rs. {b.laborCostPerBatch}/batch</>}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr><th className="px-4 py-2 font-medium">Component</th><th className="px-4 py-2 text-right font-medium">Qty / batch</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {b.components.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-1.5">{c.componentName}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{c.qtyPerBatch} {c.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <BomForm
          finishedGoods={finishedGoods}
          rawMaterials={rawMaterials}
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

type Row = { key: number; componentProductId: string; qtyPerBatch: string };
let keyc = 0;
const emptyRow = (defaultId: string): Row => ({ key: ++keyc, componentProductId: defaultId, qtyPerBatch: "" });

function BomForm({
  finishedGoods, rawMaterials, onClose, onSaved,
}: {
  finishedGoods: ProductOpt[]; rawMaterials: ProductOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [outputProductId, setOutputProductId] = useState(finishedGoods[0]?.id ?? "");
  const [outputQty, setOutputQty] = useState("1");
  const [laborCostPerBatch, setLaborCostPerBatch] = useState("0");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow(rawMaterials[0]?.id ?? "")]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) return toast("Enter a BOM name", "err");
    const components = rows
      .filter((r) => r.componentProductId && Number(r.qtyPerBatch) > 0)
      .map((r) => ({ componentProductId: r.componentProductId, qtyPerBatch: Number(r.qtyPerBatch) }));
    if (components.length === 0) return toast("Add at least one component with a quantity", "err");

    setSaving(true);
    const res = await api<{ bom: { name: string } }>("/api/manufacturing/boms", {
      method: "POST",
      body: JSON.stringify({
        name, outputProductId, outputQty: Number(outputQty) || 1,
        laborCostPerBatch: Number(laborCostPerBatch) || 0, notes: notes || undefined, components,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`BOM "${res.data.bom.name}" created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Bill of Materials" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="BOM name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Recipe" />
          </Field>
          <Field label="Produces (finished good)" required>
            <select value={outputProductId} onChange={(e) => setOutputProductId(e.target.value)} className={inputClass}>
              {finishedGoods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Output quantity per batch" required>
            <Input type="number" step="0.001" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
          </Field>
          <Field label="Labor cost per batch (Rs.)">
            <Input type="number" step="0.01" value={laborCostPerBatch} onChange={(e) => setLaborCostPerBatch(e.target.value)} />
          </Field>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Components (per batch)</h3>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <select
                  value={r.componentProductId}
                  onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, componentProductId: e.target.value } : x)))}
                  className={`${inputClass} flex-1`}
                >
                  {rawMaterials.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number" step="0.001" placeholder="Qty" value={r.qtyPerBatch}
                  onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, qtyPerBatch: e.target.value } : x)))}
                  className={`${inputClass} w-28 text-right`}
                />
                {rows.length > 1 && (
                  <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setRows((rs) => [...rs, emptyRow(rawMaterials[0]?.id ?? "")])}
            className="mt-2 text-sm font-medium text-accent hover:underline"
          >
            + Add Component
          </button>
        </div>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
