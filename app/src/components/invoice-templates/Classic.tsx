import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

export function ClassicTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;
  const hasPaymentBlock = (d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount) || (d.invoiceSetting.showQrCode && d.company?.paymentQrUrl);

  return (
    <div className="text-sm text-black">
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <BrandLogo size={56} />
            <div>
              <div className="text-lg font-bold leading-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
              {d.company && (
                <div className="mt-0.5 text-xs leading-snug text-neutral-600">
                  <div>{d.company.registeredAddress}{d.company.registeredAddress2 ? `, ${d.company.registeredAddress2}` : ""}</div>
                  <div>Tel: {d.company.phone}{d.company.phone2 ? ` / ${d.company.phone2}` : ""} · {d.company.email}</div>
                  <div>PAN: {d.company.panNumber}</div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold uppercase tracking-wide">{d.documentLabel}</div>
            <div className="mt-0.5 text-xs text-neutral-600">
              <div>No: <span className="font-medium text-black">{d.number}</span></div>
              <div>Date: <span className="font-medium text-black">{d.date}</span></div>
              <div>Fiscal Year: <span className="font-medium text-black">{d.fiscalYearName}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{d.partyLabel}</div>
          <div className="mt-1 font-medium">{d.partyName}</div>
          {d.partyPan && <div className="text-xs text-neutral-600">PAN: {d.partyPan}</div>}
        </div>
        <div className="sm:text-right">
          <div className="text-xs text-neutral-600">Reference: <span className="text-black">{d.referenceNo ?? "—"}</span></div>
          <div className="text-xs text-neutral-600">Payment mode: <span className="text-black">{d.paymentMode.replace("_", " ")}</span></div>
          <div className="text-xs text-neutral-600">Status: <span className="text-black">{d.status.replace("_", " ")}</span></div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-black text-left text-xs text-neutral-600">
          <tr>
            <th className="py-2 font-medium">Description</th>
            {d.invoiceSetting.showHsCode && <th className="py-2 font-medium">HS Code</th>}
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
            {d.invoiceSetting.showDiscountColumn && <th className="py-2 text-right font-medium">Discount</th>}
            <th className="py-2 text-right font-medium">VAT %</th>
            <th className="py-2 text-right font-medium">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-300">
          {d.items.map((it) => (
            <tr key={it.id}>
              <td className="py-2">{it.description}</td>
              {d.invoiceSetting.showHsCode && <td className="py-2 text-xs text-neutral-600">{it.hsCode ?? "—"}</td>}
              <td className="py-2 text-right tabular-nums">{it.qty}</td>
              <td className="py-2 text-right tabular-nums">{it.rate}</td>
              {d.invoiceSetting.showDiscountColumn && <td className="py-2 text-right tabular-nums">{it.discount}</td>}
              <td className="py-2 text-right tabular-nums">{it.taxRatePct}</td>
              <td className="py-2 text-right tabular-nums font-medium">{it.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="w-full max-w-xs text-sm">
          <tbody className="divide-y divide-neutral-300">
            <tr><td className="py-1 text-neutral-600">Subtotal</td><td className="py-1 text-right tabular-nums">{d.subtotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Line discount</td><td className="py-1 text-right tabular-nums">{d.lineDiscountTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Invoice discount</td><td className="py-1 text-right tabular-nums">{d.invoiceDiscount}</td></tr>
            {d.totalExciseDuty !== undefined && <tr><td className="py-1 text-neutral-600">Excise duty</td><td className="py-1 text-right tabular-nums">{d.totalExciseDuty}</td></tr>}
            {d.totalCustomDuty !== undefined && <tr><td className="py-1 text-neutral-600">Custom duty</td><td className="py-1 text-right tabular-nums">{d.totalCustomDuty}</td></tr>}
            <tr><td className="py-1 text-neutral-600">Non-taxable</td><td className="py-1 text-right tabular-nums">{d.nonTaxableTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Taxable</td><td className="py-1 text-right tabular-nums">{d.taxableTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">VAT</td><td className="py-1 text-right tabular-nums">{d.vatAmount}</td></tr>
            <tr className="border-t-2 border-black font-semibold"><td className="py-1.5">Grand Total</td><td className="py-1.5 text-right tabular-nums">Rs. {d.grandTotal}</td></tr>
            <tr><td className="py-1 text-neutral-600">Amount paid</td><td className="py-1 text-right tabular-nums">{d.amountPaid}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs italic text-neutral-600">Amount in words: {amountInWords(d.grandTotal)}</p>

      {d.notes && <p className="mt-4 text-xs text-neutral-600">{d.notes}</p>}

      <div className="mt-4 border-t border-neutral-300 pt-3">
        {d.billFooter?.termsAndConditions && <p className="text-xs text-neutral-600">{d.billFooter.termsAndConditions}</p>}
        {hasPaymentBlock && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            {d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount && (
              <div className="text-xs text-neutral-600">
                <div className="font-semibold text-black">Pay to</div>
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
        {d.billFooter?.footerNote && <p className="mt-3 text-xs text-neutral-600">{d.billFooter.footerNote}</p>}
        <div className="mt-16 flex justify-between text-xs text-neutral-600">
          <div>Prepared by</div>
          <div>{d.billFooter?.authorizedSignatory || "Authorized signature"}</div>
        </div>
      </div>
    </div>
  );
}
