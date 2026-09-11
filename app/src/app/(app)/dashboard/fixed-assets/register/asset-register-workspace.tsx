"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";
import { ASSET_CATEGORIES, CATEGORY_LABEL } from "@/lib/asset-categories";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; assetCode: string; name: string; category: string; status: string;
  acquisitionDate: string; acquisitionCost: string; accumulatedDepreciation: string;
  bookValue: string; depreciationMethod: string; disposalType: string | null; disposalDate: string | null;
};
type Contact = { id: string; name: string };
type Ledger = { id: string; name: string; code: string };

const STATUS_STYLE: Record<string, string> = { ACTIVE: "text-success", DISPOSED: "text-muted line-through" };

export function AssetRegisterWorkspace({
  initial, suppliers, cashBank, canCreate, canDispose, hasFiscalYear,
}: {
  initial: Row[]; suppliers: Contact[]; cashBank: Ledger[];
  canCreate: boolean; canDispose: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [disposing, setDisposing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        crumbs={["Fixed Assets", "Asset Register"]}
        title="Asset Register"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Asset
            </Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before recording assets.
        </Card>
      )}

      {initial.length === 0 ? (
        <EmptyState title="No fixed assets yet" hint="Add your first asset (building, vehicle, equipment…)." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Asset</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Acquired</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
                <th className="px-4 py-2 text-right font-medium">Accum. Dep.</th>
                <th className="px-4 py-2 text-right font-medium">Book Value</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((a) => (
                <tr key={a.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">
                    <button onClick={() => setViewing(a.id)} className="text-left font-medium hover:underline">
                      {a.name}
                    </button>
                    <p className="text-xs text-muted">{a.assetCode}</p>
                  </td>
                  <td className="px-4 py-2.5">{CATEGORY_LABEL[a.category] ?? a.category}</td>
                  <td className="px-4 py-2.5">{a.acquisitionDate}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.acquisitionCost}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.accumulatedDepreciation}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{a.bookValue}</td>
                  <td className={`px-4 py-2.5 text-xs font-medium ${STATUS_STYLE[a.status] ?? ""}`}>
                    {a.status === "DISPOSED" ? `DISPOSED (${a.disposalType})` : a.status}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canDispose && a.status === "ACTIVE" && (
                      <button onClick={() => setDisposing(a)} className="text-xs font-medium text-danger hover:underline">
                        Dispose
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <AssetForm
          suppliers={suppliers}
          cashBank={cashBank}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {disposing && (
        <DisposeForm
          asset={disposing}
          cashBank={cashBank}
          onClose={() => setDisposing(null)}
          onSaved={() => {
            setDisposing(null);
            router.refresh();
          }}
        />
      )}

      {viewing && <AssetDetail id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function AssetForm({
  suppliers, cashBank, onClose, onSaved,
}: {
  suppliers: Contact[]; cashBank: Ledger[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("OFFICE_EQUIPMENT");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState(today);
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("0");
  const [method, setMethod] = useState<"STRAIGHT_LINE" | "WRITTEN_DOWN_VALUE">("STRAIGHT_LINE");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("60");
  const [depreciationRatePct, setDepreciationRatePct] = useState("15");
  const [paymentMode, setPaymentMode] = useState<"CREDIT" | "CASH" | "BANK" | "CHEQUE" | "WALLET">("CREDIT");
  const [paymentLedgerId, setPaymentLedgerId] = useState(cashBank[0]?.id ?? "");
  const [supplierLedgerId, setSupplierLedgerId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isLand = category === "LAND";
  const isCash = paymentMode !== "CREDIT";

  async function save() {
    if (!name) return toast("Enter an asset name", "err");
    if (!acquisitionCost || Number(acquisitionCost) <= 0) return toast("Enter the acquisition cost", "err");
    if (!isLand && method === "STRAIGHT_LINE" && !usefulLifeMonths) return toast("Enter the useful life in months", "err");
    if (!isLand && method === "WRITTEN_DOWN_VALUE" && !depreciationRatePct) return toast("Enter the depreciation rate %", "err");
    if (isCash && !paymentLedgerId) return toast("Select the account paid from", "err");
    if (!isCash && !supplierLedgerId) return toast("Select the supplier", "err");

    setSaving(true);
    const res = await api<{ asset: { assetCode: string } }>("/api/assets", {
      method: "POST",
      body: JSON.stringify({
        name, category, serialNumber: serialNumber || undefined, location: location || undefined,
        acquisitionDate, acquisitionCost: Number(acquisitionCost), salvageValue: Number(salvageValue) || 0,
        depreciationMethod: isLand ? "STRAIGHT_LINE" : method,
        usefulLifeMonths: !isLand && method === "STRAIGHT_LINE" ? Number(usefulLifeMonths) : undefined,
        depreciationRatePct: !isLand && method === "WRITTEN_DOWN_VALUE" ? Number(depreciationRatePct) : undefined,
        paymentMode, paymentLedgerId: isCash ? paymentLedgerId : undefined,
        supplierLedgerId: !isCash ? supplierLedgerId : undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Asset ${res.data.asset.assetCode} created`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Fixed Asset" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Asset name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Toyota Hiace, HP LaserJet" />
          </Field>
          <Field label="Category" required>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Serial / registration number">
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Head Office" />
          </Field>
          <Field label="Acquisition date (AD)" required hint={`BS ${adToBs(acquisitionDate)}`}>
            <Input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
          </Field>
          <Field label="Acquisition cost (Rs.)" required>
            <Input type="number" step="0.01" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
          </Field>
          <Field label="Salvage value (Rs.)" hint="Estimated residual value at end of life">
            <Input type="number" step="0.01" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} />
          </Field>

          {!isLand && (
            <Field label="Depreciation method" required>
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={inputClass}>
                <option value="STRAIGHT_LINE">Straight Line</option>
                <option value="WRITTEN_DOWN_VALUE">Written Down Value (reducing balance)</option>
              </select>
            </Field>
          )}
          {!isLand && method === "STRAIGHT_LINE" && (
            <Field label="Useful life (months)" required>
              <Input type="number" value={usefulLifeMonths} onChange={(e) => setUsefulLifeMonths(e.target.value)} />
            </Field>
          )}
          {!isLand && method === "WRITTEN_DOWN_VALUE" && (
            <Field label="Depreciation rate % (annual)" required>
              <Input type="number" step="0.01" value={depreciationRatePct} onChange={(e) => setDepreciationRatePct(e.target.value)} />
            </Field>
          )}
          {isLand && (
            <p className="text-xs text-muted sm:col-span-2">Land is not depreciated under NFRS.</p>
          )}

          <Field label="Payment mode" required>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputClass}>
              <option value="CREDIT">Credit (from a supplier)</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="WALLET">Wallet</option>
            </select>
          </Field>
          {isCash ? (
            <Field label="Paid from" required>
              <select value={paymentLedgerId} onChange={(e) => setPaymentLedgerId(e.target.value)} className={inputClass}>
                {cashBank.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Supplier" required>
              <select value={supplierLedgerId} onChange={(e) => setSupplierLedgerId(e.target.value)} className={inputClass}>
                {suppliers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

function DisposeForm({
  asset, cashBank, onClose, onSaved,
}: {
  asset: Row; cashBank: Ledger[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [disposalDate, setDisposalDate] = useState(today);
  const [disposalType, setDisposalType] = useState<"SOLD" | "SCRAPPED" | "LOST_STOLEN_BROKEN">("SOLD");
  const [proceeds, setProceeds] = useState("0");
  const [disposalLedgerId, setDisposalLedgerId] = useState(cashBank[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const hasProceeds = Number(proceeds) > 0;

  async function save() {
    if (hasProceeds && !disposalLedgerId) return toast("Select the account receiving the proceeds", "err");
    setSaving(true);
    const res = await api<{ bookValue: string; gainLoss: string }>(`/api/assets/${asset.id}/dispose`, {
      method: "POST",
      body: JSON.stringify({
        disposalDate, disposalType, proceeds: Number(proceeds) || 0,
        disposalLedgerId: hasProceeds ? disposalLedgerId : undefined,
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    const g = Number(res.data.gainLoss);
    toast(`${asset.assetCode} disposed — ${g >= 0 ? "gain" : "loss"} Rs. ${Math.abs(g).toFixed(2)}`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Dispose ${asset.name}`}>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Book value at last depreciation: <strong>Rs. {asset.bookValue}</strong>. Any remaining
          partial-period depreciation is posted automatically before disposal.
        </p>
        <Field label="Disposal date (AD)" required hint={`BS ${adToBs(disposalDate)}`}>
          <Input type="date" value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} />
        </Field>
        <Field label="Disposal type" required>
          <select value={disposalType} onChange={(e) => setDisposalType(e.target.value as typeof disposalType)} className={inputClass}>
            <option value="SOLD">Sold</option>
            <option value="SCRAPPED">Scrapped</option>
            <option value="LOST_STOLEN_BROKEN">Lost / Stolen / Broken</option>
          </select>
        </Field>
        <Field label="Proceeds received (Rs.)">
          <Input type="number" step="0.01" value={proceeds} onChange={(e) => setProceeds(e.target.value)} />
        </Field>
        {hasProceeds && (
          <Field label="Deposited to" required>
            <select value={disposalLedgerId} onChange={(e) => setDisposalLedgerId(e.target.value)} className={inputClass}>
              {cashBank.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={saving} onClick={save}>Confirm Disposal</Button>
      </div>
    </Modal>
  );
}

type Detail = {
  assetCode: string; name: string; category: string; status: string;
  acquisitionDate: string; acquisitionCost: string; salvageValue: string;
  depreciationMethod: string; usefulLifeMonths: number | null; depreciationRatePct: string | null;
  accumulatedDepreciation: string; bookValue: string;
  disposalDate: string | null; disposalType: string | null; disposalProceeds: string | null;
  entries: { id: string; periodStart: string; periodEnd: string; amount: string }[];
};

function AssetDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ asset: Detail }>(`/api/assets/${id}`).then((res) => {
        if (res.ok) setData(res.data.asset);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <Modal open onClose={onClose} title={loading ? "Loading…" : `${data?.name} (${data?.assetCode})`} wide>
      {loading || !data ? (
        <p className="p-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted">Category</p><p className="font-medium">{CATEGORY_LABEL[data.category] ?? data.category}</p></div>
            <div><p className="text-xs text-muted">Acquired</p><p className="font-medium">{data.acquisitionDate}</p></div>
            <div><p className="text-xs text-muted">Cost</p><p className="font-medium tabular-nums">Rs. {data.acquisitionCost}</p></div>
            <div><p className="text-xs text-muted">Accum. Depreciation</p><p className="font-medium tabular-nums">Rs. {data.accumulatedDepreciation}</p></div>
            <div><p className="text-xs text-muted">Book Value</p><p className="font-medium tabular-nums">Rs. {data.bookValue}</p></div>
            <div><p className="text-xs text-muted">Method</p><p className="font-medium">{data.depreciationMethod === "STRAIGHT_LINE" ? `Straight Line (${data.usefulLifeMonths}mo)` : `WDV (${data.depreciationRatePct}%/yr)`}</p></div>
          </div>

          {data.status === "DISPOSED" && (
            <Card className="p-3 text-sm">
              Disposed {data.disposalDate} — {data.disposalType} — proceeds Rs. {data.disposalProceeds}
            </Card>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Depreciation History</h3>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Period</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.entries.length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-6 text-center text-muted">No depreciation posted yet.</td></tr>
                  )}
                  {data.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2">{e.periodStart} → {e.periodEnd}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </Modal>
  );
}
