"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "./ui";

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellingPrice?: string;
  purchasePrice?: string;
  onHand?: string | null;
};

/** Async-search combobox for picking a product (kind filterable). */
export function ProductPicker({
  value,
  onChange,
  kind = "GOODS",
  placeholder = "Add code or product",
}: {
  value: ProductOption | null;
  onChange: (p: ProductOption | null) => void;
  kind?: "GOODS" | "SERVICE" | "EXPENSE" | "";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ page: "1" });
        if (kind) qs.set("kind", kind);
        if (search) qs.set("search", search);
        const res = await fetch(`/api/inventory/products?${qs}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.ok) setOptions(json.data.rows);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [search, open, kind]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={value ? "" : "text-muted"}>{value ? value.name : placeholder}</span>
        <span className="text-xs text-muted">{value?.sku}</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 rounded-lg border border-border bg-surface p-1 shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search…"
            className="mb-1 w-full rounded-md bg-background px-2 py-1.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-accent"
          />
          <div className="max-h-56 overflow-y-auto">
            {loading && <p className="px-2 py-2 text-xs text-muted">Searching…</p>}
            {!loading && options.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted">No products found</p>
            )}
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-tint"
              >
                <span>
                  {o.name}
                  {o.onHand != null && (
                    <span className="ml-1 text-xs text-muted">· {o.onHand} {o.unit}</span>
                  )}
                </span>
                <span className="text-xs text-muted">{o.sku}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
