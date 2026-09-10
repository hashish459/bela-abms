"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inputClass } from "./ui";

export type LedgerOption = {
  id: string;
  code: string;
  name: string;
  groupName?: string;
};

/**
 * Async-search combobox for picking a ledger account. Hits `/api/accounts/ledgers`
 * with an optional `query` (e.g. `groups=CCE-01,CCE-02` for a bank picker).
 */
export function LedgerPicker({
  value,
  onChange,
  query = "",
  placeholder = "Search account",
}: {
  value: LedgerOption | null;
  onChange: (l: LedgerOption | null) => void;
  query?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LedgerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 240) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams(query);
        if (search) qs.set("search", search);
        const res = await fetch(`/api/accounts/ledgers?${qs}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.ok) setOptions(json.data.ledgers);
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
  }, [search, open, query]);

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
        <span className={value ? "" : "text-muted"}>
          {value ? `${value.name}` : placeholder}
        </span>
        <span className="text-xs text-muted">{value?.code}</span>
      </button>
      {open && pos &&
        createPortal(
        <div
          className="fixed z-[60] rounded-lg border border-border bg-surface p-1 shadow-lg"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search…"
            className="mb-1 w-full rounded-md bg-background px-2 py-1.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-accent"
          />
          <div className="max-h-60 overflow-y-auto">
            {loading && <p className="px-2 py-2 text-xs text-muted">Searching…</p>}
            {!loading && options.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted">No accounts found</p>
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
                  {o.groupName && (
                    <span className="ml-1 text-xs text-muted">· {o.groupName}</span>
                  )}
                </span>
                <span className="text-xs text-muted">{o.code}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
