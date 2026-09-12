import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { ReceiptTemplateData } from "./types";

/** Clean formal payment receipt — mirrors the Classic invoice template's
 * visual language (same letterhead pattern) so every printed document from
 * this company looks like it belongs to the same set, but with no line-item
 * table since a receipt has nothing to itemize. */
export function ClassicReceiptTemplate({ data }: { data: ReceiptTemplateData }) {
  const d = data;

  return (
    <div className="text-sm text-black">
      <div className="mb-6 flex items-start justify-between gap-6 border-b-2 border-black pb-4">
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
          <div className="text-base font-bold uppercase tracking-wide">Payment Receipt</div>
          <div className="mt-0.5 text-xs text-neutral-600">
            <div>No: <span className="font-medium text-black">{d.number}</span></div>
            <div>Date: <span className="font-medium text-black">{d.date}</span></div>
            <div>Fiscal Year: <span className="font-medium text-black">{d.fiscalYearName}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Received From</div>
        <div className="mt-1 text-base font-medium">{d.customerName}</div>
        {d.customerPan && <div className="text-xs text-neutral-600">PAN: {d.customerPan}</div>}
      </div>

      <div className="my-4 flex items-center justify-between rounded-md border-2 border-black px-4 py-3">
        <span className="text-sm font-bold uppercase tracking-wide">Amount Received</span>
        <span className="text-2xl font-black tabular-nums">Rs. {d.amount}</span>
      </div>
      <p className="mb-4 text-xs italic text-neutral-600">{amountInWords(d.amount)}</p>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs text-neutral-500">Payment mode</div>
          <div className="font-medium">{d.paymentMode.replace("_", " ")}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Deposited to</div>
          <div className="font-medium">{d.paymentLedgerName}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Against</div>
          <div className="font-medium">{d.againstNumber ?? "On account"}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Reference</div>
          <div className="font-medium">{d.reference ?? "—"}</div>
        </div>
      </div>

      {d.notes && <p className="mt-4 text-xs text-neutral-600">{d.notes}</p>}

      <div className="mt-16 flex items-end justify-between border-t border-neutral-300 pt-3 text-xs text-neutral-600">
        <div>This is a computer-generated receipt.</div>
        <div className="text-right">
          <div className="mb-1 border-t border-neutral-400 pt-1">{d.authorizedSignatory || "Authorized signature"}</div>
        </div>
      </div>
    </div>
  );
}
