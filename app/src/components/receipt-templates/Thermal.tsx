import { amountInWords } from "@/lib/number-to-words";
import type { ReceiptTemplateData } from "./types";

const DASH = "- - - - - - - - - - - - - - - - - - -";

/** POS receipt-printer layout — the most practically relevant of the receipt
 * templates, since a payment receipt is often handed over at the same
 * counter/printer as a thermal sales receipt. Mirrors the Thermal invoice
 * template's structure. */
export function ThermalReceiptTemplate({ data }: { data: ReceiptTemplateData }) {
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
      <div className="text-center text-xs font-bold uppercase">Payment Receipt</div>
      <div className="my-1.5 text-center">{DASH}</div>

      <div>No: {d.number}</div>
      <div>Date: {d.date}</div>
      <div>From: {d.customerName}</div>
      {d.customerPan && <div>PAN: {d.customerPan}</div>}
      <div>Mode: {d.paymentMode.replace("_", " ")}</div>
      <div>To: {d.paymentLedgerName}</div>
      <div>Against: {d.againstNumber ?? "On account"}</div>
      {d.reference && <div>Ref: {d.reference}</div>}

      <div className="my-1.5">{DASH}</div>
      <div className="flex justify-between text-sm font-bold"><span>RECEIVED</span><span>Rs.{d.amount}</span></div>
      <div className="my-1.5">{DASH}</div>

      <p className="text-[10px]">{amountInWords(d.amount)}</p>
      {d.notes && <p className="mt-1 text-[10px]">{d.notes}</p>}

      <div className="my-1.5 text-center">{DASH}</div>
      <p className="text-center text-[10px]">Thank you for your payment!</p>
    </div>
  );
}
