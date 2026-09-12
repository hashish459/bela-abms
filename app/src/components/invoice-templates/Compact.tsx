import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

/** Half-page layout for A5 paper or a quick single-line-item receipt — no
 * logo/signature block, since those cost too much vertical space at A5. */
export function CompactTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;

  return (
    <div className="text-xs text-black">
      <div className="mb-2 flex items-baseline justify-between border-b border-black pb-1.5">
        <div>
          <div className="text-sm font-bold leading-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
          {d.company && <div className="text-[10px] text-neutral-600">{d.company.registeredAddress} · PAN {d.company.panNumber}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase">{d.documentLabel}</div>
          <div className="text-[10px] text-neutral-600">{d.number} · {d.date}</div>
        </div>
      </div>

      <div className="mb-2 flex justify-between text-[10px]">
        <div>
          <span className="text-neutral-500">{d.partyLabel}: </span>
          <span className="font-medium">{d.partyName}</span>
          {d.partyPan && <span className="text-neutral-500"> (PAN {d.partyPan})</span>}
        </div>
        <div className="text-neutral-500">{d.paymentMode.replace("_", " ")}{d.referenceNo ? ` · Ref ${d.referenceNo}` : ""}</div>
      </div>

      <table className="w-full text-[10px]">
        <thead className="border-b border-neutral-400 text-left text-neutral-500">
          <tr>
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 text-right font-medium">Qty</th>
            <th className="py-1 text-right font-medium">Rate</th>
            <th className="py-1 text-right font-medium">VAT%</th>
            <th className="py-1 text-right font-medium">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {d.items.map((it) => (
            <tr key={it.id}>
              <td className="py-1">{it.description}{it.hsCode ? ` (${it.hsCode})` : ""}</td>
              <td className="py-1 text-right tabular-nums">{it.qty}</td>
              <td className="py-1 text-right tabular-nums">{it.rate}</td>
              <td className="py-1 text-right tabular-nums">{it.taxRatePct}</td>
              <td className="py-1 text-right tabular-nums font-medium">{it.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex justify-end">
        <table className="w-40 text-[10px]">
          <tbody>
            <tr><td className="text-neutral-500">Taxable</td><td className="text-right tabular-nums">{d.taxableTotal}</td></tr>
            <tr><td className="text-neutral-500">VAT</td><td className="text-right tabular-nums">{d.vatAmount}</td></tr>
            <tr className="border-t border-black font-bold"><td className="py-0.5">Total</td><td className="py-0.5 text-right tabular-nums">Rs. {d.grandTotal}</td></tr>
            <tr><td className="text-neutral-500">Paid</td><td className="text-right tabular-nums">{d.amountPaid}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mt-1.5 text-[9px] italic text-neutral-500">{amountInWords(d.grandTotal)}</p>
      {d.notes && <p className="mt-1 text-[9px] text-neutral-500">{d.notes}</p>}
      {d.billFooter?.termsAndConditions && <p className="mt-1 text-[9px] text-neutral-500">{d.billFooter.termsAndConditions}</p>}

      <div className="mt-4 flex justify-between text-[9px] text-neutral-500">
        <div>Prepared by</div>
        <div>{d.billFooter?.authorizedSignatory || "Authorized signature"}</div>
      </div>
    </div>
  );
}
