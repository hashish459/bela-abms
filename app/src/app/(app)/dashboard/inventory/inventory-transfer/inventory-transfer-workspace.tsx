"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { ProductPicker, type ProductOption } from "@/components/product-picker";

type Row = {
  id: string; date: string; kind: string; product: string; warehouse: string;
  qty: string; source: string; narration: string | null;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };
type Warehouse = { id: string; name: string };

const KINDS = [
  "OPENING", "PURCHASE", "SALE", "SALES_RETURN", "PURCHASE_RETURN",
  "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_IN", "TRANSFER_OUT",
  "MANUFACTURE_IN", "MANUFACTURE_OUT",
];

export function InventoryTransferWorkspace({
  initial, warehouses,
}: {
  initial: List; warehouses: Warehouse[];
}) {
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [kind, setKind] = useState("");
  const [list, setList] = useState<List>(initial);

  useEffect(() => {
    const t = setTimeout(async () => {
      const qs = new URLSearchParams({ page: "1" });
      if (product) qs.set("productId", product.id);
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (kind) qs.set("kind", kind);
      const res = await fetch(`/api/inventory/stock-movements?${qs}`);
      const json = await res.json();
      if (json.ok) setList(json.data);
    }, 200);
    return () => clearTimeout(t);
  }, [product, warehouseId, kind]);

  return (
    <>
      <PageHeader crumbs={["Inventory", "Inventory Transfer"]} title="Inventory Transfer" />
      <p className="mb-3 text-xs text-muted">
        Every stock movement across every product and warehouse — purchases, sales,
        adjustments, transfers, manufacturing. To move stock between two warehouses, use
        Warehouse Transfer; this is its read-only ledger alongside every other movement kind.
      </p>

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <ProductPicker value={product} onChange={setProduct} placeholder="Filter by product" kind="" />
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClass}>
          <option value="">All warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          <option value="">All movement kinds</option>
          {KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {list.rows.length === 0 ? (
        <EmptyState title="No movements found" hint="Try clearing a filter." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Warehouse</th>
                <th className="px-4 py-2 font-medium">Kind</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5">{r.product}</td>
                  <td className="px-4 py-2.5 text-muted">{r.warehouse}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.kind.replace(/_/g, " ")}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(r.qty) < 0 ? "text-danger" : "text-success"}`}>
                    {r.qty}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {list.total > list.pageSize && (
        <p className="mt-2 text-xs text-muted">Showing {list.rows.length} of {list.total}</p>
      )}
    </>
  );
}
