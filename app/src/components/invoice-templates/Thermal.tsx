import { amountInWords } from "@/lib/number-to-words";
import type { InvoiceTemplateData } from "./types";

const DASH = "- - - - - - - - - - - - - - - - - - -";

/** POS receipt-printer layout — narrow single column, no table borders,
 * dashed-line separators. Constrained to a true 80mm width on real print
 * (`print:max-w-[80mm]`); the on-screen preview just centers a narrow card. */
export function ThermalTemplate({ data }: { data: InvoiceTemplateData }) {
  const d = data;

  return (
    <div className="mx-auto max-w-[300px] font-mono text-[11px] leading-snug text-black print:max-w-[80mm]">
      <div className="text-center">
        <div className="text-sm font-bold">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
        {d.company && (
          <>
            <div className="text-[10px]">{d.company.registeredAddress}</div>
            <div className="text-[10px]">Tel: {d.company.phone}</div>
            <div className="text-[10px]">PAN: {d.company.panNumber}</div>
          </>
        )}
      </div>

      <div className="my-1.5 text-center">{DASH}</div>
      <div className="text-center text-xs font-bold uppercase">{d.documentLabel}</div>
      <div className="my-1.5 text-center">{DASH}</div>

      <div>No: {d.number}</div>
      <div>Date: {d.date}</div>
      <div>{d.partyLabel}: {d.partyName}</div>
      {d.partyPan && <div>PAN: {d.partyPan}</div>}
      <div>Pay: {d.paymentMode.replace("_", " ")}</div>

      <div className="my-1.5">{DASH}</div>

      {d.items.map((it) => (
        <div key={it.id} className="mb-1">
          <div>{it.description}</div>
          <div className="flex justify-between text-[10px]">
            <span>{it.qty} x {it.rate}</span>
            <span>{it.amount}</span>
          </div>
        </div>
      ))}

      <div className="my-1.5">{DASH}</div>

      <div className="flex justify-between"><span>Subtotal</span><span>{d.subtotal}</span></div>
      <div className="flex justify-between"><span>Discount</span><span>{d.lineDiscountTotal}</span></div>
      <div className="flex justify-between"><span>VAT</span><span>{d.vatAmount}</span></div>
      <div className="my-1 flex justify-between text-sm font-bold"><span>TOTAL</span><span>Rs.{d.grandTotal}</span></div>
      <div className="flex justify-between text-[10px]"><span>Paid</span><span>{d.amountPaid}</span></div>

      <div className="my-1.5">{DASH}</div>
      <p className="text-[10px]">{amountInWords(d.grandTotal)}</p>

      {d.notes && <p className="mt-1 text-[10px]">{d.notes}</p>}
      {d.billFooter?.footerNote && <p className="mt-1 text-center text-[10px]">{d.billFooter.footerNote}</p>}

      <div className="my-1.5 text-center">{DASH}</div>
      <p className="text-center text-[10px]">Thank you for your business!</p>
    </div>
  );
}
