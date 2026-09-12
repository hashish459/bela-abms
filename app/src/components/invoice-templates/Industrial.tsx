import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

const STEEL = "#1f2328";
const SAFETY_YELLOW = "#f5c518";

const HAZARD_STRIPES = {
  backgroundImage: `repeating-linear-gradient(135deg, ${SAFETY_YELLOW}, ${SAFETY_YELLOW} 14px, ${STEEL} 14px, ${STEEL} 28px)`,
};

/** Factory-floor / site-office styling — steel grey and safety-yellow hazard
 * striping, built for a manufacturing or construction business rather than
 * a generic retail invoice. */
export function IndustrialTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;
  const hasPaymentBlock = (d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount) || (d.invoiceSetting.showQrCode && d.company?.paymentQrUrl);

  return (
    <div className="text-sm text-black">
      <div className="h-3 rounded-t-sm" style={HAZARD_STRIPES} />
      <div className="mb-6 flex items-center justify-between gap-6 px-5 py-5 text-white" style={{ backgroundColor: STEEL }}>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded bg-white p-1.5">
            <BrandLogo size={44} />
          </div>
          <div>
            <div className="text-lg font-black uppercase leading-tight tracking-wide">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
            {d.company && (
              <div className="mt-0.5 text-xs leading-snug text-white/70">
                <div>{d.company.registeredAddress}{d.company.registeredAddress2 ? `, ${d.company.registeredAddress2}` : ""}</div>
                <div>Tel: {d.company.phone} · {d.company.email} · PAN: {d.company.panNumber}</div>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black uppercase tracking-widest" style={{ color: SAFETY_YELLOW }}>{d.documentLabel}</div>
          <div className="mt-1 text-xs text-white/70">
            <div>No: <span className="font-semibold text-white">{d.number}</span></div>
            <div>Date: <span className="font-semibold text-white">{d.date}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 px-1 sm:grid-cols-2">
        <div className="border-l-4 bg-neutral-100 p-3" style={{ borderColor: SAFETY_YELLOW }}>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">{d.partyLabel}</div>
          <div className="mt-1 font-semibold">{d.partyName}</div>
          {d.partyPan && <div className="text-xs text-neutral-600">PAN: {d.partyPan}</div>}
        </div>
        <div className="border-l-4 bg-neutral-100 p-3 sm:text-right" style={{ borderColor: STEEL }}>
          <div className="text-xs text-neutral-600">PO / Ref: <span className="font-medium text-black">{d.referenceNo ?? "—"}</span></div>
          <div className="text-xs text-neutral-600">Payment mode: <span className="font-medium text-black">{d.paymentMode.replace("_", " ")}</span></div>
          <div className="text-xs text-neutral-600">Fiscal Year: <span className="font-medium text-black">{d.fiscalYearName}</span></div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-white" style={{ backgroundColor: STEEL }}>
          <tr>
            <th className="py-2 pl-3 font-bold tracking-wide">Description</th>
            {d.invoiceSetting.showHsCode && <th className="py-2 font-bold tracking-wide">HS Code</th>}
            <th className="py-2 text-right font-bold tracking-wide">Qty</th>
            <th className="py-2 text-right font-bold tracking-wide">Rate</th>
            {d.invoiceSetting.showDiscountColumn && <th className="py-2 text-right font-bold tracking-wide">Discount</th>}
            <th className="py-2 text-right font-bold tracking-wide">VAT %</th>
            <th className="py-2 pr-3 text-right font-bold tracking-wide">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {d.items.map((it, i) => (
            <tr key={it.id} style={{ backgroundColor: i % 2 ? "#f4f4f3" : "transparent" }}>
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
        <div className="flex w-full max-w-xs items-center justify-between px-4 py-2.5" style={{ backgroundColor: STEEL }}>
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: SAFETY_YELLOW }}>Grand Total</span>
          <span className="text-lg font-black tabular-nums text-white">Rs. {d.grandTotal}</span>
        </div>
      </div>
      <p className="mt-1 flex justify-end pr-1 text-xs text-neutral-500">Paid: Rs. {d.amountPaid}</p>

      <p className="mt-3 text-xs italic text-neutral-600">Amount in words: {amountInWords(d.grandTotal)}</p>

      {d.notes && (
        <div className="mt-4 border-l-4 bg-neutral-50 p-2 text-xs text-neutral-700" style={{ borderColor: SAFETY_YELLOW }}>
          <div className="font-bold uppercase tracking-wide text-neutral-500">Site / Job Notes</div>
          {d.notes}
        </div>
      )}

      <div className="mt-4 border-t-4 pt-3" style={{ borderColor: STEEL }}>
        {d.billFooter?.termsAndConditions && <p className="text-xs text-neutral-600">{d.billFooter.termsAndConditions}</p>}
        {hasPaymentBlock && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            {d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount && (
              <div className="text-xs text-neutral-600">
                <div className="font-bold uppercase" style={{ color: STEEL }}>Pay to</div>
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
        <div className="mt-14 flex justify-between text-xs">
          <div className="text-neutral-600">Received by (site)</div>
          <div className="font-bold uppercase" style={{ color: STEEL }}>{d.billFooter?.authorizedSignatory || "Authorized signature"}</div>
        </div>
      </div>
    </div>
  );
}
