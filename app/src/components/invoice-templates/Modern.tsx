import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

const NAVY = "#16213e";
const ORANGE = "#f5821f";

export function ModernTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;
  const hasPaymentBlock = (d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount) || (d.invoiceSetting.showQrCode && d.company?.paymentQrUrl);

  return (
    <div className="text-sm text-black">
      <div
        className="mb-6 flex items-center justify-between gap-6 rounded-t-lg px-6 py-5 text-white"
        style={{ background: `linear-gradient(135deg, ${NAVY}, #223159)` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-1.5">
            <BrandLogo size={44} />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
            {d.company && (
              <div className="mt-0.5 text-xs leading-snug text-white/80">
                <div>{d.company.registeredAddress}{d.company.registeredAddress2 ? `, ${d.company.registeredAddress2}` : ""}</div>
                <div>Tel: {d.company.phone} · {d.company.email} · PAN: {d.company.panNumber}</div>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black uppercase tracking-wide" style={{ color: ORANGE }}>{d.documentLabel}</div>
          <div className="mt-1 text-xs text-white/80">
            <div>No: <span className="font-semibold text-white">{d.number}</span></div>
            <div>Date: <span className="font-semibold text-white">{d.date}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 px-1 sm:grid-cols-2">
        <div className="rounded-md p-3" style={{ backgroundColor: "rgba(245,130,31,0.08)" }}>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ORANGE }}>{d.partyLabel}</div>
          <div className="mt-1 font-semibold">{d.partyName}</div>
          {d.partyPan && <div className="text-xs text-neutral-600">PAN: {d.partyPan}</div>}
        </div>
        <div className="rounded-md bg-neutral-50 p-3 sm:text-right">
          <div className="text-xs text-neutral-600">Reference: <span className="font-medium text-black">{d.referenceNo ?? "—"}</span></div>
          <div className="text-xs text-neutral-600">Payment mode: <span className="font-medium text-black">{d.paymentMode.replace("_", " ")}</span></div>
          <div className="text-xs text-neutral-600">Fiscal Year: <span className="font-medium text-black">{d.fiscalYearName}</span></div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-white" style={{ backgroundColor: NAVY }}>
          <tr>
            <th className="rounded-l-md py-2 pl-3 font-semibold">Description</th>
            {d.invoiceSetting.showHsCode && <th className="py-2 font-semibold">HS Code</th>}
            <th className="py-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Rate</th>
            {d.invoiceSetting.showDiscountColumn && <th className="py-2 text-right font-semibold">Discount</th>}
            <th className="py-2 text-right font-semibold">VAT %</th>
            <th className="rounded-r-md py-2 pr-3 text-right font-semibold">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={it.id} style={{ backgroundColor: i % 2 ? "rgba(0,0,0,0.03)" : "transparent" }}>
              <td className="py-2 pl-3">{it.description}</td>
              {d.invoiceSetting.showHsCode && <td className="py-2 text-xs text-neutral-600">{it.hsCode ?? "—"}</td>}
              <td className="py-2 text-right tabular-nums">{it.qty}</td>
              <td className="py-2 text-right tabular-nums">{it.rate}</td>
              {d.invoiceSetting.showDiscountColumn && <td className="py-2 text-right tabular-nums">{it.discount}</td>}
              <td className="py-2 text-right tabular-nums">{it.taxRatePct}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-medium">{it.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="w-full max-w-xs text-sm">
          <tbody className="divide-y divide-neutral-200">
            <tr><td className="py-1 text-neutral-600">Subtotal</td><td className="py-1 text-right tabular-nums">{d.subtotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Line discount</td><td className="py-1 text-right tabular-nums">{d.lineDiscountTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Invoice discount</td><td className="py-1 text-right tabular-nums">{d.invoiceDiscount}</td></tr>
            {d.totalExciseDuty !== undefined && <tr><td className="py-1 text-neutral-600">Excise duty</td><td className="py-1 text-right tabular-nums">{d.totalExciseDuty}</td></tr>}
            {d.totalCustomDuty !== undefined && <tr><td className="py-1 text-neutral-600">Custom duty</td><td className="py-1 text-right tabular-nums">{d.totalCustomDuty}</td></tr>}
            <tr><td className="py-1 text-neutral-600">Taxable</td><td className="py-1 text-right tabular-nums">{d.taxableTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">VAT</td><td className="py-1 text-right tabular-nums">{d.vatAmount}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-end">
        <div
          className="flex w-full max-w-xs items-center justify-between rounded-md px-4 py-2.5 text-white"
          style={{ backgroundColor: ORANGE }}
        >
          <span className="text-sm font-bold uppercase">Grand Total</span>
          <span className="text-lg font-black tabular-nums">Rs. {d.grandTotal}</span>
        </div>
      </div>
      <p className="mt-1 flex justify-end pr-1 text-xs text-neutral-500">Paid: Rs. {d.amountPaid}</p>

      <p className="mt-3 text-xs italic text-neutral-600">Amount in words: {amountInWords(d.grandTotal)}</p>

      {d.notes && <p className="mt-4 text-xs text-neutral-600">{d.notes}</p>}

      <div className="mt-4 border-t-2 pt-3" style={{ borderColor: ORANGE }}>
        {d.billFooter?.termsAndConditions && <p className="text-xs text-neutral-600">{d.billFooter.termsAndConditions}</p>}
        {hasPaymentBlock && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            {d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount && (
              <div className="text-xs text-neutral-600">
                <div className="font-semibold" style={{ color: NAVY }}>Pay to</div>
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
        {d.billFooter?.footerNote && <p className="mt-3 text-xs italic text-neutral-600">{d.billFooter.footerNote}</p>}
        <div className="mt-14 flex justify-between text-xs text-neutral-600">
          <div>Prepared by</div>
          <div className="font-medium" style={{ color: NAVY }}>{d.billFooter?.authorizedSignatory || "Authorized signature"}</div>
        </div>
      </div>
    </div>
  );
}
