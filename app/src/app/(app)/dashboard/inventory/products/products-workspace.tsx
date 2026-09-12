"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Barcode, Plus, Search } from "lucide-react";
import {
  api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";

type Kind = "GOODS" | "SERVICE" | "EXPENSE";
type Row = {
  id: string; sku: string; name: string; kind: Kind; category: string | null;
  unit: string; sellingPrice: string; purchasePrice: string; tax: string; onHand: string | null;
  barcodeValue: string | null;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Opt = { id: string; name: string };
type UnitOpt = { id: string; name: string; shortName: string };
type TaxOpt = { id: string; name: string; ratePct: number; isNoTax: boolean };

const KIND_LABEL: Record<Kind, string> = { GOODS: "Goods", SERVICE: "Services", EXPENSE: "Expense" };

export function ProductsWorkspace({
  initial,
  categories,
  units,
  warehouses,
  taxRates,
  canCreate,
}: {
  initial: List;
  categories: Opt[];
  units: UnitOpt[];
  warehouses: Opt[];
  taxRates: TaxOpt[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("GOODS");
  const [search, setSearch] = useState("");
  const [list, setList] = useState<List>(initial);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const qs = new URLSearchParams({ kind, page: "1" });
      if (search) qs.set("search", search);
      const res = await fetch(`/api/inventory/products?${qs}`);
      const json = await res.json();
      if (json.ok) setList(json.data);
    }, 200);
    return () => clearTimeout(t);
  }, [kind, search]);

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Products"]}
        title="Products"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add product
            </Button>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-background p-1 ring-1 ring-border">
          {(["GOODS", "SERVICE", "EXPENSE"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                kind === k ? "bg-surface shadow-sm" : "text-muted"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {list.rows.length === 0 ? (
        <EmptyState
          title="No products"
          hint={`Add your first ${KIND_LABEL[kind].toLowerCase()} to start invoicing.`}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Code / SKU</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Purchase</th>
                <th className="px-4 py-2 text-right font-medium">Selling</th>
                <th className="px-4 py-2 font-medium">Tax</th>
                {kind === "GOODS" && <th className="px-4 py-2 text-right font-medium">On hand</th>}
                {kind === "GOODS" && <th className="px-4 py-2 font-medium">Barcode</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((p) => (
                <tr key={p.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 font-medium">{p.sku}</td>
                  <td className="px-4 py-2.5">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">{p.category || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{p.purchasePrice}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{p.sellingPrice}</td>
                  <td className="px-4 py-2.5 text-muted">{p.tax}</td>
                  {kind === "GOODS" && (
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {p.onHand} {p.unit}
                    </td>
                  )}
                  {kind === "GOODS" && (
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/dashboard/inventory/products/${p.id}/barcode`}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <Barcode size={13} /> {p.barcodeValue ?? "Generate"}
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {list.total > list.pageSize && (
        <p className="mt-2 text-xs text-muted">
          {list.rows.length} of {list.total}
        </p>
      )}

      {creating && (
        <ProductForm
          kind={kind}
          categories={categories}
          units={units}
          warehouses={warehouses}
          taxRates={taxRates}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
            setSearch((s) => s); // trigger reload
          }}
        />
      )}
    </>
  );
}

function ProductForm({
  kind,
  categories,
  units,
  warehouses,
  taxRates,
  onClose,
  onSaved,
}: {
  kind: Kind;
  categories: Opt[];
  units: UnitOpt[];
  warehouses: Opt[];
  taxRates: TaxOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: "", categoryId: "", hsnCode: "", sku: "", reorderPoint: "", description: "",
    unitId: units[0]?.id ?? "", subUnitId: "", subUnitConversion: "",
    purchasePrice: "", sellingPrice: "",
    taxRateId: taxRates.find((t) => !t.isNoTax)?.id ?? "",
    taxBasis: "EXCLUSIVE", isNonTaxable: false,
    inventoryRole: "FINISHED_GOODS",
    size: "", color: "", flavour: "",
    openingQty: "", openingWarehouseId: warehouses.find(Boolean)?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    const res = await api<{ product: { sku: string } }>("/api/inventory/products", {
      method: "POST",
      body: JSON.stringify({
        ...f,
        kind,
        reorderPoint: f.reorderPoint ? Number(f.reorderPoint) : undefined,
        subUnitConversion: f.subUnitConversion ? Number(f.subUnitConversion) : undefined,
        purchasePrice: Number(f.purchasePrice) || 0,
        sellingPrice: Number(f.sellingPrice) || 0,
        openingQty: kind === "GOODS" && f.openingQty ? Number(f.openingQty) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Product ${res.data.product.sku} created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Add ${KIND_LABEL[kind]}`} wide>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            General Info
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={f.name} onChange={set("name")} placeholder="Eg: Old Durbar" />
            </Field>
            <Field label="Category">
              <select value={f.categoryId} onChange={set("categoryId")} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Code / SKU" required>
              <div className="flex gap-2">
                <Input value={f.sku} onChange={set("sku")} placeholder="Eg: SKU-0001" />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setF((s) => ({ ...s, sku: `SKU-${Date.now().toString(36).toUpperCase()}` }))}
                >
                  Gen
                </Button>
              </div>
            </Field>
            <Field label="HSN Code">
              <Input value={f.hsnCode} onChange={set("hsnCode")} placeholder="Eg: 220300" />
            </Field>
            {kind === "GOODS" && (
              <Field label="Re-order point (in unit)">
                <Input type="number" step="0.001" value={f.reorderPoint} onChange={set("reorderPoint")} />
              </Field>
            )}
            {kind === "GOODS" && (
              <Field label="Inventory role" hint="Raw materials feed a Bill of Materials; finished goods are what you sell">
                <select value={f.inventoryRole} onChange={set("inventoryRole")} className={inputClass}>
                  <option value="FINISHED_GOODS">Finished Goods</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                </select>
              </Field>
            )}
            <Field label="Description">
              <Input value={f.description} onChange={set("description")} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Units & Pricing</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Unit" required>
              <select value={f.unitId} onChange={set("unitId")} className={inputClass}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.shortName})</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-unit">
              <select value={f.subUnitId} onChange={set("subUnitId")} className={inputClass}>
                <option value="">None</option>
                {units.filter((u) => u.id !== f.unitId).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            {f.subUnitId && (
              <Field label="Sub-units per primary unit">
                <Input type="number" step="0.000001" value={f.subUnitConversion} onChange={set("subUnitConversion")} />
              </Field>
            )}
            <Field label="Purchase price (Rs.)">
              <Input type="number" step="0.01" value={f.purchasePrice} onChange={set("purchasePrice")} />
            </Field>
            <Field label="Selling price (Rs.)">
              <Input type="number" step="0.01" value={f.sellingPrice} onChange={set("sellingPrice")} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tax</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.isNonTaxable}
                onChange={(e) => setF((s) => ({ ...s, isNonTaxable: e.target.checked }))}
              />
              Non-taxable (VAT-exempt)
            </label>
            {!f.isNonTaxable && (
              <>
                <Field label="Tax rate">
                  <select value={f.taxRateId} onChange={set("taxRateId")} className={inputClass}>
                    {taxRates.filter((t) => !t.isNoTax).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Price basis">
                  <select value={f.taxBasis} onChange={set("taxBasis")} className={inputClass}>
                    <option value="EXCLUSIVE">Tax Exclusive</option>
                    <option value="INCLUSIVE">Tax Inclusive</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </section>

        {kind === "GOODS" && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Opening Stock</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opening quantity (in unit)">
                <Input type="number" step="0.001" value={f.openingQty} onChange={set("openingQty")} />
              </Field>
              <Field label="Warehouse">
                <select value={f.openingWarehouseId} onChange={set("openingWarehouseId")} className={inputClass}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Attributes (optional)</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Size"><Input value={f.size} onChange={set("size")} /></Field>
            <Field label="Color"><Input value={f.color} onChange={set("color")} /></Field>
            <Field label="Flavour"><Input value={f.flavour} onChange={set("flavour")} /></Field>
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save} disabled={!f.name || !f.sku || !f.unitId}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
