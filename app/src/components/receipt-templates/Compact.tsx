import { amountInWords } from "@/lib/number-to-words";
import type { ReceiptTemplateData } from "./types";

/** Dense half-page layout — no logo, minimal spacing, for a quick voucher-
 * book-style receipt rather than a full letterhead document. */
export function CompactReceiptTemplate({ data }: { data: ReceiptTemplateData }) {
  const d = data;

  return (
    <div className="text-xs text-black">
      <div className="mb-2 flex items-baseline justify-between border-b border-black pb-1.5">
        <div>
          <div className="text-sm font-bold leading-tight">{d.company?.displayName || d.company?.legalName || "Bela Nepal Industries"}</div>
          {d.company && <div className="text-[10px] text-neutral-600">{d.company.registeredAddress} · PAN {d.company.panNumber}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase">Payment Receipt</div>
          <div className="text-[10px] text-neutral-600">{d.number} · {d.date}</div>
        </div>
      </div>

      <div className="mb-2 flex justify-between text-[10px]">
        <div><span className="text-neutral-500">Received from: </span><span className="font-medium">{d.customerName}</span></div>
        <div className="text-neutral-500">{d.paymentMode.replace("_", " ")}</div>
      </div>

      <div className="flex items-center justify-between border border-black px-2 py-1.5">
        <span className="text-[10px] font-bold uppercase">Amount</span>
        <span className="text-base font-bold tabular-nums">Rs. {d.amount}</span>
      </div>
      <p className="mt-1 text-[9px] italic text-neutral-500">{amountInWords(d.amount)}</p>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        <div><span className="text-neutral-500">Deposited to: </span>{d.paymentLedgerName}</div>
        <div><span className="text-neutral-500">Against: </span>{d.againstNumber ?? "On account"}</div>
        <div><span className="text-neutral-500">Reference: </span>{d.reference ?? "—"}</div>
      </div>

      {d.notes && <p className="mt-1 text-[9px] text-neutral-500">{d.notes}</p>}

      <div className="mt-4 flex justify-between text-[9px] text-neutral-500">
        <div>Computer-generated</div>
        <div>{d.authorizedSignatory || "Authorized signature"}</div>
      </div>
    </div>
  );
}
