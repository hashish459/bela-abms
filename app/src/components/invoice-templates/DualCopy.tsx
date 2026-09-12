import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

/** One condensed copy of the invoice — used twice by DualCopyTemplate below
 * (Original on top, Customer Copy on the bottom) on a single A4 sheet, the
 * common Nepali business practice of keeping a carbon-style copy in-house. */
function OneCopy({ data, label }: { data: InvoiceTemplateData; label: string }) {
  const d = data;
  return (
    <div className="text-xs text-black">
      <div className="mb-2 flex items-start justify-between border-b border-black pb-2">
        <div className="flex items-center gap-2">
          <BrandLogo size={36} />
          <div>
            <div className="text-sm font-bold leading-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
            {d.company && <div className="text-[10px] text-neutral-600">{d.company.registeredAddress} · PAN {d.company.panNumber}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
          <div className="text-xs font-bold uppercase">{d.documentLabel}</div>
          <div className="text-[10px] text-neutral-600">{d.number} · {d.date}</div>
        </div>
      </div>

      <div className="mb-1.5 flex justify-between text-[10px]">
        <div><span className="text-neutral-500">{d.partyLabel}: </span><span className="font-medium">{d.partyName}</span></div>
        <div className="text-neutral-500">{d.paymentMode.replace("_", " ")}</div>
      </div>

      <table className="w-full text-[10px]">
        <thead className="border-b border-neutral-400 text-left text-neutral-500">
          <tr>
            <th className="py-0.5 font-medium">Item</th>
            <th className="py-0.5 text-right font-medium">Qty</th>
            <th className="py-0.5 text-right font-medium">Rate</th>
            <th className="py-0.5 text-right font-medium">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {d.items.map((it) => (
            <tr key={it.id}>
              <td className="py-0.5">{it.description}</td>
              <td className="py-0.5 text-right tabular-nums">{it.qty}</td>
              <td className="py-0.5 text-right tabular-nums">{it.rate}</td>
              <td className="py-0.5 text-right tabular-nums font-medium">{it.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1.5 flex items-start justify-between gap-4">
        <p className="max-w-[55%] text-[9px] italic text-neutral-500">{amountInWords(d.grandTotal)}</p>
        <table className="w-36 text-[10px]">
          <tbody>
            <tr><td className="text-neutral-500">Taxable</td><td className="text-right tabular-nums">{d.taxableTotal}</td></tr>
            <tr><td className="text-neutral-500">VAT</td><td className="text-right tabular-nums">{d.vatAmount}</td></tr>
            <tr className="border-t border-black font-bold"><td className="py-0.5">Total</td><td className="py-0.5 text-right tabular-nums">Rs. {d.grandTotal}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-between text-[9px] text-neutral-500">
        <div>Received by: ______________</div>
        <div>{d.billFooter?.authorizedSignatory || "Authorized signature"}</div>
      </div>
    </div>
  );
}

export function DualCopyTemplate({ data }: { data: InvoiceTemplateData }) {
  return (
    <div>
      <OneCopy data={data} label="Original" />
      <div className="my-4 flex items-center gap-2 text-neutral-400">
        <span className="text-xs">✂</span>
        <div className="flex-1 border-t border-dashed border-neutral-400" />
        <span className="text-xs">✂</span>
      </div>
      <OneCopy data={data} label="Customer Copy" />
    </div>
  );
}
