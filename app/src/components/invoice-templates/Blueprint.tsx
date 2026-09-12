import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

const INK = "#1e3a5f";
const PAPER = "#eef4fb";
const GRID = {
  backgroundImage: `linear-gradient(rgba(30,58,95,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,0.10) 1px, transparent 1px)`,
  backgroundSize: "16px 16px",
  backgroundColor: PAPER,
};

/** Corner registration marks like a drawing sheet's title-block crop marks. */
function CornerMarks() {
  const corner = "absolute h-3 w-3 border-current";
  return (
    <>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} style={{ color: INK }} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} style={{ color: INK }} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} style={{ color: INK }} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} style={{ color: INK }} />
    </>
  );
}

/** Technical-drawing styling — engineering grid paper, corner registration
 * marks, monospace ink-blue typography — for a construction/engineering
 * shop that wants its paperwork to look like its drawings. */
export function BlueprintTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;
  const hasPaymentBlock = (d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount) || (d.invoiceSetting.showQrCode && d.company?.paymentQrUrl);

  return (
    <div className="p-4 font-mono text-sm" style={{ ...GRID, color: INK }}>
      <div className="relative mb-6 border-2 p-4" style={{ borderColor: INK }}>
        <CornerMarks />
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-lg font-bold uppercase tracking-widest">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
            {d.company && (
              <div className="mt-1 text-[11px] leading-snug opacity-80">
                <div>{d.company.registeredAddress}{d.company.registeredAddress2 ? `, ${d.company.registeredAddress2}` : ""}</div>
                <div>TEL {d.company.phone} · PAN {d.company.panNumber}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold uppercase tracking-[0.2em]">{d.documentLabel}</div>
            <div className="mt-1 text-[11px] opacity-80">
              <div>DWG NO: <span className="font-bold">{d.number}</span></div>
              <div>DATE: <span className="font-bold">{d.date}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 border-y py-2 sm:grid-cols-3" style={{ borderColor: INK }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-70">{d.partyLabel}</div>
          <div className="font-bold">{d.partyName}</div>
          {d.partyPan && <div className="text-[11px] opacity-70">PAN {d.partyPan}</div>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-70">PO / Contract No.</div>
          <div className="font-bold">{d.referenceNo ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-70">Terms</div>
          <div className="font-bold">{d.paymentMode.replace("_", " ")}</div>
        </div>
      </div>

      <table className="w-full text-[12px]">
        <thead className="border-b-2 text-left text-[10px] uppercase tracking-wider" style={{ borderColor: INK }}>
          <tr>
            <th className="py-1.5 font-bold">Item</th>
            {d.invoiceSetting.showHsCode && <th className="py-1.5 font-bold">HS</th>}
            <th className="py-1.5 text-right font-bold">Qty</th>
            <th className="py-1.5 text-right font-bold">Rate</th>
            {d.invoiceSetting.showDiscountColumn && <th className="py-1.5 text-right font-bold">Disc.</th>}
            <th className="py-1.5 text-right font-bold">VAT%</th>
            <th className="py-1.5 text-right font-bold">{d.amountColumnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it) => (
            <tr key={it.id} className="border-b" style={{ borderColor: "rgba(30,58,95,0.25)" }}>
              <td className="py-1.5">{it.description}</td>
              {d.invoiceSetting.showHsCode && <td className="py-1.5 opacity-70">{it.hsCode ?? "—"}</td>}
              <td className="py-1.5 text-right tabular-nums">{it.qty}</td>
              <td className="py-1.5 text-right tabular-nums">{it.rate}</td>
              {d.invoiceSetting.showDiscountColumn && <td className="py-1.5 text-right tabular-nums">{it.discount}</td>}
              <td className="py-1.5 text-right tabular-nums">{it.taxRatePct}</td>
              <td className="py-1.5 text-right tabular-nums font-bold">{it.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="relative w-full max-w-xs border-2 p-3" style={{ borderColor: INK }}>
          <CornerMarks />
          <table className="w-full text-[12px]">
            <tbody>
              <tr><td className="py-0.5 opacity-70">Subtotal</td><td className="py-0.5 text-right tabular-nums">{d.subtotal}</td></tr>
              <tr><td className="py-0.5 opacity-70">Taxable</td><td className="py-0.5 text-right tabular-nums">{d.taxableTotal}</td></tr>
              <tr><td className="py-0.5 opacity-70">VAT</td><td className="py-0.5 text-right tabular-nums">{d.vatAmount}</td></tr>
              <tr className="border-t-2 font-bold" style={{ borderColor: INK }}>
                <td className="py-1 uppercase tracking-wide">Total</td>
                <td className="py-1 text-right tabular-nums text-base">Rs. {d.grandTotal}</td>
              </tr>
              <tr><td className="py-0.5 opacity-70">Paid</td><td className="py-0.5 text-right tabular-nums">{d.amountPaid}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[11px] italic opacity-80">{amountInWords(d.grandTotal)}</p>

      {d.notes && (
        <p className="mt-3 border-l-2 pl-2 text-[11px] opacity-80" style={{ borderColor: INK }}>
          SITE NOTE — {d.notes}
        </p>
      )}

      <div className="mt-4 border-t-2 pt-3" style={{ borderColor: INK }}>
        {d.billFooter?.termsAndConditions && <p className="text-[11px] opacity-80">{d.billFooter.termsAndConditions}</p>}
        {hasPaymentBlock && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4 text-[11px]">
            {d.invoiceSetting.showBankDetails && d.billFooter?.bankAccount && (
              <div>
                <div className="font-bold uppercase tracking-wide">Remit To</div>
                <div>{d.billFooter.bankAccount.bankName}</div>
                <div>{d.billFooter.bankAccount.accountName} — {d.billFooter.bankAccount.accountNumber}</div>
              </div>
            )}
            {d.invoiceSetting.showQrCode && d.company?.paymentQrUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- company-uploaded QR
              <img src={d.company.paymentQrUrl} alt="Payment QR code" className="h-20 w-20 object-contain" />
            )}
          </div>
        )}
        <div className="mt-12 flex justify-between text-[11px]">
          <div className="border-t border-dashed pt-1" style={{ borderColor: INK, width: "40%" }}>Checked by</div>
          <div className="border-t border-dashed pt-1 text-right" style={{ borderColor: INK, width: "40%" }}>
            {d.billFooter?.authorizedSignatory || "Authorized signature"}
          </div>
        </div>
      </div>
    </div>
  );
}
