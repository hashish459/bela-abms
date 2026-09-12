"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { inputClass } from "./ui";
import { ProductPicker, type ProductOption } from "./product-picker";
import type { TaxOpt } from "./sales-line-editor";

export type PurchaseEditorLine = {
  key: number;
  product: ProductOption | null;
  description: string;
  hsCode: string;
  qty: string;
  rate: string;
  discount: string;
  exciseDuty: string;
  customDuty: string;
  taxRateId: string;
  batchNo: string;
  expiryDate: string;
};

export type PurchaseTotals = {
  subtotal: string;
  totalExciseDuty: string;
  totalCustomDuty: string;
  nonTaxableTotal: string;
  taxableTotal: string;
  vatAmount: string;
  grandTotal: string;
  invoiceDiscount: string;
  lines: { lineTotal: string }[];
};

let keyc = 0;
export const newPurchaseLine = (): PurchaseEditorLine => ({
  key: ++keyc, product: null, description: "", hsCode: "",
  qty: "1", rate: "", discount: "0", exciseDuty: "0", customDuty: "0", taxRateId: "",
  batchNo: "", expiryDate: "",
});

export function PurchaseLineEditor({
  lines,
  setLines,
  taxRates,
  invoiceDiscount,
  setInvoiceDiscount,
  onTotals,
}: {
  lines: PurchaseEditorLine[];
  setLines: (fn: (ls: PurchaseEditorLine[]) => PurchaseEditorLine[]) => void;
  taxRates: TaxOpt[];
  invoiceDiscount: string;
  setInvoiceDiscount: (v: string) => void;
  onTotals: (t: PurchaseTotals) => void;
}) {
  const [totals, setTotals] = useState<PurchaseTotals | null>(null);
  const defaultTaxId = taxRates.find((t) => !t.isNoTax)?.id ?? "";

  const patch = (key: number, p: Partial<PurchaseEditorLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  useEffect(() => {
    const payload = {
      invoiceDiscount: Number(invoiceDiscount) || 0,
      lines: lines
        .filter((l) => (Number(l.qty) || 0) > 0)
        .map((l) => ({
          productId: l.product?.id || undefined,
          qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0,
          discount: Number(l.discount) || 0,
          exciseDuty: Number(l.exciseDuty) || 0,
          customDuty: Number(l.customDuty) || 0,
          taxRateId: l.taxRateId || undefined,
          isNonTaxable: !l.taxRateId,
        })),
    };
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (payload.lines.length === 0) {
        setTotals(null);
        return;
      }
      try {
        const res = await fetch("/api/purchase/calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (json.ok) {
          setTotals(json.data);
          onTotals(json.data);
        }
      } catch {
        /* aborted */
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), invoiceDiscount]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Item / product</th>
              <th className="w-20 px-2 py-2 font-medium">H.S Code</th>
              <th className="w-16 px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Rate</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Excise</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Custom</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Discount</th>
              <th className="w-24 px-2 py-2 font-medium">Tax</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((l, i) => (
              <tr key={l.key}>
                <td className="min-w-48 px-2 py-1.5">
                  <ProductPicker
                    value={l.product}
                    kind="GOODS"
                    onChange={(p) =>
                      patch(l.key, {
                        product: p,
                        description: p?.name ?? l.description,
                        rate: p?.purchasePrice ?? l.rate,
                        taxRateId: l.taxRateId || defaultTaxId,
                      })
                    }
                  />
                  <input
                    value={l.description}
                    onChange={(e) => patch(l.key, { description: e.target.value })}
                    placeholder="Description"
                    className="mt-1 w-full rounded-md bg-background px-2 py-1 text-xs outline-none ring-1 ring-border"
                  />
                  {l.product && (
                    <div className="mt-1 flex gap-1">
                      <input
                        value={l.batchNo}
                        onChange={(e) => patch(l.key, { batchNo: e.target.value })}
                        placeholder="Batch no. (optional)"
                        className="w-1/2 rounded-md bg-background px-2 py-1 text-xs outline-none ring-1 ring-border"
                      />
                      <input
                        type="date"
                        value={l.expiryDate}
                        onChange={(e) => patch(l.key, { expiryDate: e.target.value })}
                        title="Expiry date"
                        className="w-1/2 rounded-md bg-background px-2 py-1 text-xs outline-none ring-1 ring-border"
                      />
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input value={l.hsCode} onChange={(e) => patch(l.key, { hsCode: e.target.value })} className={inputClass} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="0.001" value={l.qty} onChange={(e) => patch(l.key, { qty: e.target.value })} className={`${inputClass} text-right`} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="0.01" value={l.rate} onChange={(e) => patch(l.key, { rate: e.target.value })} className={`${inputClass} text-right`} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="0.01" value={l.exciseDuty} onChange={(e) => patch(l.key, { exciseDuty: e.target.value })} className={`${inputClass} text-right`} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="0.01" value={l.customDuty} onChange={(e) => patch(l.key, { customDuty: e.target.value })} className={`${inputClass} text-right`} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="0.01" value={l.discount} onChange={(e) => patch(l.key, { discount: e.target.value })} className={`${inputClass} text-right`} />
                </td>
                <td className="px-2 py-1.5">
                  <select value={l.taxRateId} onChange={(e) => patch(l.key, { taxRateId: e.target.value })} className={inputClass}>
                    <option value="">Non-taxable</option>
                    {taxRates.filter((t) => !t.isNoTax).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-muted">
                  {totals?.lines?.[i]?.lineTotal ?? "—"}
                </td>
                <td className="px-1 py-1.5 text-center">
                  {lines.length > 1 && (
                    <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setLines((ls) => [...ls, newPurchaseLine()])} className="text-sm font-medium text-accent hover:underline">
        + Add code or product
      </button>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <Row label="Total" value={totals?.subtotal} />
        <Row label="Total Excise Duty" value={totals?.totalExciseDuty} />
        <Row label="Total Custom Duty" value={totals?.totalCustomDuty} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">Discount (Rs)</span>
          <input type="number" step="0.01" value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(e.target.value)}
            className="w-24 rounded-md bg-background px-2 py-1 text-right text-sm outline-none ring-1 ring-border" />
        </div>
        <Row label="Non-taxable Total" value={totals?.nonTaxableTotal} />
        <Row label="Taxable Total" value={totals?.taxableTotal} />
        <Row label="VAT" value={totals?.vatAmount} />
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>Grand Total</span>
          <span className="tabular-nums">Rs. {totals?.grandTotal ?? "0.00"}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="tabular-nums">Rs. {value ?? "0.00"}</span>
    </div>
  );
}
