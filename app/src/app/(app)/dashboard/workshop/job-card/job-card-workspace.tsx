"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";
import { CustomFieldsFields, CustomFieldsDisplay } from "@/components/custom-fields-fields";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; customerName: string; vehicleRegNo: string;
  vehicleMake: string | null; vehicleModel: string | null; complaint: string;
  status: string; invoiceId: string | null; estimateTotal: string;
};
type Opt = { id: string; name: string };
type ProductOpt = { id: string; name: string; sellingPrice: string };
type TaxOpt = { id: string; name: string; ratePct: number; isNoTax: boolean };
type Ledger = { id: string; name: string; code: string };

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-accent", BILLED: "text-success", CANCELLED: "text-muted line-through",
};

export function JobCardWorkspace({
  initial, customers, technicians, parts, services, taxRates, cashBank, canCreate, canBill, hasFiscalYear,
}: {
  initial: Row[]; customers: Opt[]; technicians: Opt[]; parts: ProductOpt[]; services: ProductOpt[];
  taxRates: TaxOpt[]; cashBank: Ledger[]; canCreate: boolean; canBill: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [billing, setBilling] = useState<Row | null>(null);

  async function cancelJobCard(id: string) {
    if (!confirm("Cancel this job card? This cannot be undone.")) return;
    const res = await api(`/api/workshop/job-cards/${id}/cancel`, { method: "POST" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Job card cancelled");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Workshop", "Job Card"]}
        title="Job Card"
        action={
          canCreate && hasFiscalYear && (
            <Button onClick={() => setCreating(true)}><Plus size={15} /> New Job Card</Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before opening job cards.
        </Card>
      )}

      {initial.length === 0 ? (
        <EmptyState title="No job cards yet" hint="Open one when a vehicle comes in for service." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Job Card</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Complaint</th>
                <th className="px-4 py-2 text-right font-medium">Est. Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((jc) => (
                <tr key={jc.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">
                    <button onClick={() => setViewing(jc.id)} className="text-left font-medium hover:underline">{jc.number}</button>
                    <p className="text-xs text-muted">{jc.customerName} · {jc.date}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    {jc.vehicleRegNo}
                    <p className="text-xs text-muted">{[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(" ") || "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{jc.complaint}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">Rs. {jc.estimateTotal}</td>
                  <td className={`px-4 py-2.5 text-xs font-medium ${STATUS_STYLE[jc.status] ?? ""}`}>{jc.status}</td>
                  <td className="px-4 py-2.5 text-right">
                    {canBill && jc.status === "OPEN" && (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setBilling(jc)} className="text-xs font-medium text-accent hover:underline">Bill</button>
                        <button onClick={() => cancelJobCard(jc.id)} className="text-xs font-medium text-danger hover:underline">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <JobCardForm
          customers={customers} technicians={technicians} parts={parts} services={services} taxRates={taxRates}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}

      {billing && (
        <BillForm
          jobCard={billing} technicians={technicians} parts={parts} services={services} taxRates={taxRates} cashBank={cashBank}
          onClose={() => setBilling(null)}
          onSaved={() => { setBilling(null); router.refresh(); }}
        />
      )}

      {viewing && <JobCardDetail id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/* ────────────────────────────  Shared item rows  ───────────────────────── */

type ItemRow = {
  key: number; itemType: "PART" | "LABOR"; productId: string; technicianId: string;
  description: string; qty: string; rate: string; discount: string; taxRateId: string;
};
let keyc = 0;
const emptyItem = (itemType: "PART" | "LABOR"): ItemRow => ({
  key: ++keyc, itemType, productId: "", technicianId: "", description: "", qty: "1", rate: "0", discount: "0", taxRateId: "",
});

function ItemsEditor({
  rows, setRows, technicians, parts, services, taxRates,
}: {
  rows: ItemRow[]; setRows: (fn: (rs: ItemRow[]) => ItemRow[]) => void;
  technicians: Opt[]; parts: ProductOpt[]; services: ProductOpt[]; taxRates: TaxOpt[];
}) {
  const patch = (key: number, p: Partial<ItemRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const total = rows.reduce((a, r) => a + ((Number(r.qty) || 0) * (Number(r.rate) || 0) - (Number(r.discount) || 0)), 0);

  return (
    <div>
      <div className="space-y-2">
        {rows.map((r) => {
          const options = r.itemType === "PART" ? parts : services;
          return (
            <div key={r.key} className="rounded-lg border border-border p-2">
              <div className="mb-1.5 flex items-center gap-2">
                <select value={r.itemType} onChange={(e) => patch(r.key, { itemType: e.target.value as "PART" | "LABOR", productId: "" })} className={`${inputClass} w-28`}>
                  <option value="PART">Part</option>
                  <option value="LABOR">Labor</option>
                </select>
                <select
                  value={r.productId}
                  onChange={(e) => {
                    const p = options.find((o) => o.id === e.target.value);
                    patch(r.key, { productId: e.target.value, ...(p ? { description: p.name, rate: p.sellingPrice } : {}) });
                  }}
                  className={`${inputClass} flex-1`}
                >
                  <option value="">Free text…</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {r.itemType === "LABOR" && (
                  <select value={r.technicianId} onChange={(e) => patch(r.key, { technicianId: e.target.value })} className={`${inputClass} w-40`}>
                    <option value="">No technician</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input placeholder="Description" value={r.description} onChange={(e) => patch(r.key, { description: e.target.value })} className={`${inputClass} flex-1`} />
                <input type="number" step="0.001" placeholder="Qty" value={r.qty} onChange={(e) => patch(r.key, { qty: e.target.value })} className={`${inputClass} w-20 text-right`} />
                <input type="number" step="0.01" placeholder="Rate" value={r.rate} onChange={(e) => patch(r.key, { rate: e.target.value })} className={`${inputClass} w-24 text-right`} />
                <input type="number" step="0.01" placeholder="Discount" value={r.discount} onChange={(e) => patch(r.key, { discount: e.target.value })} className={`${inputClass} w-24 text-right`} />
                <select value={r.taxRateId} onChange={(e) => patch(r.key, { taxRateId: e.target.value })} className={`${inputClass} w-32`}>
                  <option value="">No VAT</option>
                  {taxRates.filter((t) => !t.isNoTax).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-3">
          <button onClick={() => setRows((rs) => [...rs, emptyItem("PART")])} className="text-sm font-medium text-accent hover:underline">+ Part</button>
          <button onClick={() => setRows((rs) => [...rs, emptyItem("LABOR")])} className="text-sm font-medium text-accent hover:underline">+ Labor</button>
        </div>
        <p className="text-sm text-muted">Subtotal: <strong className="text-foreground">Rs. {total.toFixed(2)}</strong> (excl. VAT)</p>
      </div>
    </div>
  );
}

function itemsPayload(rows: ItemRow[]) {
  return rows
    .filter((r) => (Number(r.qty) || 0) > 0 && r.description)
    .map((r) => ({
      itemType: r.itemType, productId: r.productId || undefined, technicianId: r.technicianId || undefined,
      description: r.description, qty: Number(r.qty), rate: Number(r.rate) || 0, discount: Number(r.discount) || 0,
      taxRateId: r.taxRateId || undefined, isNonTaxable: !r.taxRateId,
    }));
}

/* ─────────────────────────────  Create form  ───────────────────────────── */

function JobCardForm({
  customers, technicians, parts, services, taxRates, onClose, onSaved,
}: {
  customers: Opt[]; technicians: Opt[]; parts: ProductOpt[]; services: ProductOpt[]; taxRates: TaxOpt[];
  onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [customerLedgerId, setCustomerLedgerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleRegNo, setVehicleRegNo] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [odometerReading, setOdometerReading] = useState("");
  const [complaint, setComplaint] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerLedgerId && !customerName) return toast("Select a customer or enter a walk-in name", "err");
    if (!vehicleRegNo) return toast("Enter the vehicle registration number", "err");
    if (!complaint) return toast("Describe the complaint / work requested", "err");

    setSaving(true);
    const res = await api<{ jobCard: { number: string } }>("/api/workshop/job-cards", {
      method: "POST",
      body: JSON.stringify({
        date, customerLedgerId: customerLedgerId || undefined, customerName: customerName || undefined,
        customerPhone: customerPhone || undefined, vehicleRegNo, vehicleMake: vehicleMake || undefined,
        vehicleModel: vehicleModel || undefined, odometerReading: odometerReading ? Number(odometerReading) : undefined,
        complaint, notes: notes || undefined, items: itemsPayload(rows), customFields,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Job card ${res.data.jobCard.number} opened`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Job Card" wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer">
            <select value={customerLedgerId} onChange={(e) => setCustomerLedgerId(e.target.value)} className={inputClass}>
              <option value="">Walk-in (enter name below)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {!customerLedgerId && (
            <Field label="Walk-in customer name" required>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Field>
          )}
          <Field label="Customer phone">
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </Field>
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Vehicle registration no." required>
            <Input value={vehicleRegNo} onChange={(e) => setVehicleRegNo(e.target.value)} placeholder="e.g. Ba 2 Cha 1234" />
          </Field>
          <Field label="Make">
            <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="e.g. Toyota" />
          </Field>
          <Field label="Model">
            <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="e.g. Hiace" />
          </Field>
          <Field label="Odometer reading">
            <Input type="number" value={odometerReading} onChange={(e) => setOdometerReading(e.target.value)} />
          </Field>
        </div>

        <Field label="Complaint / work requested" required>
          <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Engine noise, brake service" />
        </Field>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Estimate (optional — the final bill can differ once work is complete)
          </h3>
          <ItemsEditor rows={rows} setRows={setRows} technicians={technicians} parts={parts} services={services} taxRates={taxRates} />
        </div>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <CustomFieldsFields
          module="JOB_CARD"
          values={customFields}
          onChange={(id, v) => setCustomFields((s) => ({ ...s, [id]: v }))}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Open Job Card</Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────  Bill form  ─────────────────────────────── */

function BillForm({
  jobCard, technicians, parts, services, taxRates, cashBank, onClose, onSaved,
}: {
  jobCard: Row; technicians: Opt[]; parts: ProductOpt[]; services: ProductOpt[]; taxRates: TaxOpt[]; cashBank: Ledger[];
  onClose: () => void; onSaved: () => void;
}) {
  const [paymentMode, setPaymentMode] = useState<"CREDIT" | "CASH" | "BANK" | "CHEQUE" | "WALLET">("CASH");
  const [paymentLedgerId, setPaymentLedgerId] = useState(cashBank[0]?.id ?? "");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const isCash = paymentMode !== "CREDIT";

  async function save() {
    const items = itemsPayload(rows);
    if (items.length === 0) return toast("Add at least one part or labor line before billing", "err");
    if (isCash && !paymentLedgerId) return toast("Select the account that received payment", "err");

    setSaving(true);
    const res = await api<{ invoiceNumber: string }>(`/api/workshop/job-cards/${jobCard.id}/bill`, {
      method: "POST",
      body: JSON.stringify({
        paymentMode, paymentLedgerId: isCash ? paymentLedgerId : undefined,
        invoiceDiscount: Number(invoiceDiscount) || 0, items,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Billed as Sales Invoice ${res.data.invoiceNumber}`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Complete & Bill — ${jobCard.number}`} wide>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <p className="text-xs text-muted">
          {jobCard.customerName} · {jobCard.vehicleRegNo} — enter what was actually done; this
          becomes a real Sales Invoice (stock is consumed for parts, revenue is posted to the
          ledger).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Payment mode" required>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputClass}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="WALLET">Wallet</option>
              <option value="CREDIT">Credit</option>
            </select>
          </Field>
          {isCash && (
            <Field label="Received into" required>
              <select value={paymentLedgerId} onChange={(e) => setPaymentLedgerId(e.target.value)} className={inputClass}>
                {cashBank.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Overall discount (Rs.)">
            <Input type="number" step="0.01" value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(e.target.value)} />
          </Field>
        </div>

        <ItemsEditor rows={rows} setRows={setRows} technicians={technicians} parts={parts} services={services} taxRates={taxRates} />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Bill Job Card</Button>
      </div>
    </Modal>
  );
}

/* ───────────────────────────────  Detail  ──────────────────────────────── */

type Detail = {
  number: string; date: string; customerName: string | null; customerPhone: string | null;
  vehicleRegNo: string; vehicleMake: string | null; vehicleModel: string | null; odometerReading: string | null;
  complaint: string; notes: string | null; status: string; estimateTotal: string; invoiceId: string | null;
  items: { id: string; itemType: string; productName: string | null; technicianName: string | null; description: string; qty: string; rate: string; discount: string }[];
  customFieldValues: { id: string; label: string; fieldType: string; value: string | null }[];
};

function JobCardDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ jobCard: Detail }>(`/api/workshop/job-cards/${id}`).then((res) => {
        if (res.ok) setData(res.data.jobCard);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <Modal open onClose={onClose} title={loading ? "Loading…" : `${data?.number}`} wide>
      {loading || !data ? (
        <p className="p-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted">Customer</p><p className="font-medium">{data.customerName ?? "—"}</p></div>
            <div><p className="text-xs text-muted">Vehicle</p><p className="font-medium">{data.vehicleRegNo}</p></div>
            <div><p className="text-xs text-muted">Make / Model</p><p className="font-medium">{[data.vehicleMake, data.vehicleModel].filter(Boolean).join(" ") || "—"}</p></div>
            <div><p className="text-xs text-muted">Status</p><p className="font-medium">{data.status}</p></div>
            <div><p className="text-xs text-muted">Odometer</p><p className="font-medium">{data.odometerReading ?? "—"}</p></div>
            <div><p className="text-xs text-muted">Estimate</p><p className="font-medium tabular-nums">Rs. {data.estimateTotal}</p></div>
          </div>
          <div><p className="text-xs text-muted">Complaint</p><p className="text-sm">{data.complaint}</p></div>

          <CustomFieldsDisplay values={data.customFieldValues} />

          {data.status === "BILLED" && data.invoiceId && (
            <Card className="p-3 text-sm">
              Billed as a Sales Invoice — the items actually charged (which may differ from
              the estimate below) are on that invoice under{" "}
              <Link href="/dashboard/sales/invoice" className="text-accent hover:underline">Sales › Sales Invoice</Link>.
            </Card>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Items {data.status === "BILLED" ? "(original estimate)" : ""}</h3>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Technician</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No items recorded yet.</td></tr>
                  )}
                  {data.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2">{it.itemType}</td>
                      <td className="px-3 py-2">{it.description}</td>
                      <td className="px-3 py-2 text-muted">{it.technicianName ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.rate}</td>
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
