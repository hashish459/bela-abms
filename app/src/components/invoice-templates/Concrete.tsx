import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

const INK = "#1a1a1a";

/** Minimal architectural-plan look — heavy black rules, high-contrast
 * blocks, no colour beyond black/white/grey. For a builder or fabricator
 * whose own drawings and site signage already use this register. */
export function ConcreteTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;
  const hasPaymentBlock = (d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount) || (d.invoiceSetting.showQrCode && d.company?.paymentQrUrl);

  return (
    <div className="text-sm" style={{ color: INK }}>
      <div className="flex items-center justify-between gap-6 px-1 py-4 text-white" style={{ backgroundColor: INK }}>
        <div className="flex items-center gap-3">
          <BrandLogo size={40} />
          <div className="text-lg font-black uppercase tracking-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
        </div>
        <div className="text-2xl font-black uppercase tracking-widest">{d.documentLabel}</div>
      </div>
      <div className="h-1.5 bg-neutral-400" />

      <div className="mt-4 flex items-start justify-between gap-6 px-1 text-xs">
        {d.company && (
          <div className="leading-snug text-neutral-600">
            <div>{d.company.registeredAddress}{d.company.registeredAddress2 ? `, ${d.company.registeredAddress2}` : ""}</div>
            <div>Tel: {d.company.phone} · {d.company.email} · PAN: {d.company.panNumber}</div>
          </div>
        )}
        <div className="text-right text-neutral-600">
          <div>No: <span className="font-bold text-black">{d.number}</span></div>
          <div>Date: <span className="font-bold text-black">{d.date}</span></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-0 border-y-2 sm:grid-cols-3" style={{ borderColor: INK }}>
        <div className="border-neutral-300 p-3 sm:border-r">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{d.partyLabel}</div>
          <div className="mt-1 font-bold">{d.partyName}</div>
          {d.partyPan && <div className="text-xs text-neutral-600">PAN {d.partyPan}</div>}
        </div>
        <div className="border-neutral-300 p-3 sm:border-r">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Reference</div>
          <div className="mt-1 font-bold">{d.referenceNo ?? "—"}</div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Payment Terms</div>
          <div className="mt-1 font-bold">{d.paymentMode.replace("_", " ")}</div>
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead className="border-b-2 text-left text-xs uppercase tracking-wide text-neutral-500" style={{ borderColor: INK }}>
          <tr>
            <th className="py-2 font-bold">Description</th>
            {d.invoiceSetting.showHsCode && <th className="py-2 font-bold">HS Code</th>}
            <th className="py-2 text-right font-bold">Qty</th>
            <th className="py-2 text-right font-bold">Rate</th>
            {d.invoiceSetting.showDiscountColumn && <th className="py-2 text-right font-bold">Discount</th>}
            <th className="py-2 text-right font-bold">VAT %</th>
            <th className="py-2 text-right font-bold">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {d.items.map((it) => (
            <tr key={it.id}>
              <td className="py-2">{it.description}</td>
              {d.invoiceSetting.showHsCode && <td className="py-2 text-xs text-neutral-600">{it.hsCode ?? "—"}</td>}
              <td className="py-2 text-right tabular-nums">{it.qty}</td>
              <td className="py-2 text-right tabular-nums">{it.rate}</td>
              {d.invoiceSetting.showDiscountColumn && <td className="py-2 text-right tabular-nums">{it.discount}</td>}
              <td className="py-2 text-right tabular-nums">{it.taxRatePct}</td>
              <td className="py-2 text-right tabular-nums font-bold">{it.amount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2" style={{ borderColor: INK }}><td colSpan={99} className="py-0" /></tr>
        </tfoot>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="w-full max-w-xs text-sm">
          <tbody className="divide-y divide-neutral-200">
            <tr><td className="py-1 text-neutral-600">Subtotal</td><td className="py-1 text-right tabular-nums">{d.subtotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Line discount</td><td className="py-1 text-right tabular-nums">{d.lineDiscountTotal}</td></tr>
            {d.totalExciseDuty !== undefined && <tr><td className="py-1 text-neutral-600">Excise duty</td><td className="py-1 text-right tabular-nums">{d.totalExciseDuty}</td></tr>}
            {d.totalCustomDuty !== undefined && <tr><td className="py-1 text-neutral-600">Custom duty</td><td className="py-1 text-right tabular-nums">{d.totalCustomDuty}</td></tr>}
            <tr><td className="py-1 text-neutral-600">Taxable</td><td className="py-1 text-right tabular-nums">{d.taxableTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">VAT</td><td className="py-1 text-right tabular-nums">{d.vatAmount}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <div className="flex w-full max-w-xs items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: INK }}>
          <span className="text-sm font-black uppercase tracking-widest">Total</span>
          <span className="text-xl font-black tabular-nums">Rs. {d.grandTotal}</span>
        </div>
      </div>
      <p className="mt-1 flex justify-end text-xs text-neutral-500">Paid: Rs. {d.amountPaid}</p>

      <p className="mt-3 text-xs italic text-neutral-600">{amountInWords(d.grandTotal)}</p>

      {d.notes && <p className="mt-4 border-l-2 border-neutral-400 pl-2 text-xs text-neutral-600">{d.notes}</p>}

      <div className="mt-4 border-t-2 pt-3" style={{ borderColor: INK }}>
        {d.billFooter?.termsAndConditions && <p className="text-xs text-neutral-600">{d.billFooter.termsAndConditions}</p>}
        {hasPaymentBlock && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            {d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount && (
              <div className="text-xs text-neutral-600">
                <div className="font-bold uppercase text-black">Pay to</div>
                <div>{d.billFooter.bankAccount.bankName}</div>
                <div>{d.billFooter.bankAccount.accountName} — {d.billFooter.bankAccount.accountNumber}</div>
                {d.billFooter.bankAccount.branch && <div>{d.billFooter.bankAccount.branch}</div>}
              </div>
            )}
            {d.invoiceSetting.showQrCode && d.company?.paymentQrUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- company-uploaded QR
              <img src={d.company.paymentQrUrl} alt="Payment QR code" className="h-20 w-20 object-contain" />
            )}
          </div>
        )}
        <div className="mt-14 grid grid-cols-2 gap-6 text-xs">
          <div className="border-2 p-3 text-center" style={{ borderColor: INK }}>Site Supervisor</div>
          <div className="border-2 p-3 text-center font-bold" style={{ borderColor: INK }}>
            {d.billFooter?.authorizedSignatory || "Authorized signature"}
          </div>
        </div>
      </div>
    </div>
  );
}
