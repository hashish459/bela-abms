import { BrandLogo } from "@/components/brand-logo";
import { amountInWords } from "@/lib/number-to-words";
import type { ReceiptTemplateData } from "./types";

const NAVY = "#16213e";
const ORANGE = "#f5821f";

/** Brand-accented receipt — mirrors the Modern invoice template's visual
 * language (navy/orange gradient header, bold callout band). */
export function ModernReceiptTemplate({ data }: { data: ReceiptTemplateData }) {
  const d = data;

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
          <div className="text-xl font-black uppercase tracking-wide" style={{ color: ORANGE }}>Receipt</div>
          <div className="mt-1 text-xs text-white/80">
            <div>No: <span className="font-semibold text-white">{d.number}</span></div>
            <div>Date: <span className="font-semibold text-white">{d.date}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-md p-3" style={{ backgroundColor: "rgba(245,130,31,0.08)" }}>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ORANGE }}>Received From</div>
        <div className="mt-1 font-semibold">{d.customerName}</div>
        {d.customerPan && <div className="text-xs text-neutral-600">PAN: {d.customerPan}</div>}
      </div>

      <div className="flex items-center justify-between rounded-md px-4 py-3 text-white" style={{ backgroundColor: ORANGE }}>
        <span className="text-sm font-bold uppercase">Amount Received</span>
        <span className="text-2xl font-black tabular-nums">Rs. {d.amount}</span>
      </div>
      <p className="mt-2 text-xs italic text-neutral-600">{amountInWords(d.amount)}</p>

      <div className="mt-4 grid gap-3 rounded-md bg-neutral-50 p-3 text-sm sm:grid-cols-2">
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

      <div className="mt-14 flex items-end justify-between border-t-2 pt-3 text-xs text-neutral-600" style={{ borderColor: ORANGE }}>
        <div>Thank you for your business.</div>
        <div className="font-medium" style={{ color: NAVY }}>{d.authorizedSignatory || "Authorized signature"}</div>
      </div>
    </div>
  );
}
