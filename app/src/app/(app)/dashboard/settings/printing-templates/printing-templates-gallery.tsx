"use client";

import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { api, Button, Card, Modal, PageHeader, toast } from "@/components/ui";
import {
  InvoiceTemplateRenderer,
  TEMPLATE_OPTIONS,
  type InvoiceTemplateData,
  type TemplateCompany,
  type TemplateBillFooter,
  type TemplateInvoiceSetting,
} from "@/components/invoice-templates";

const SAMPLE_ITEMS: InvoiceTemplateData["items"] = [
  { id: "1", description: "A4 Paper Ream", hsCode: "4802", qty: "5.000", rate: "450.00", discount: "0.00", taxRatePct: "13.00", amount: "2,250.00" },
  { id: "2", description: "Office Chair", hsCode: "9401", qty: "2.000", rate: "4,500.00", discount: "200.00", taxRatePct: "13.00", amount: "8,800.00" },
];

function sampleData(company: TemplateCompany, invoiceSetting: TemplateInvoiceSetting, billFooter: TemplateBillFooter): InvoiceTemplateData {
  return {
    documentLabel: "Tax Invoice",
    number: "SA-2083/84-0042",
    date: "2026-09-12 (BS 2083-05-27)",
    fiscalYearName: "2083-84",
    partyLabel: "Bill To",
    partyName: "Everest Retail Store",
    partyPan: "601234567",
    referenceNo: "PO-118",
    paymentMode: "CREDIT",
    status: "OPEN",
    amountColumnLabel: "Amount",
    items: SAMPLE_ITEMS,
    subtotal: "11,050.00",
    lineDiscountTotal: "200.00",
    invoiceDiscount: "0.00",
    nonTaxableTotal: "0.00",
    taxableTotal: "10,850.00",
    vatAmount: "1,410.50",
    grandTotal: "12,260.50",
    amountPaid: "0.00",
    notes: "Goods once sold will not be taken back.",
    company,
    billFooter,
    invoiceSetting,
  };
}

export function PrintingTemplatesGallery({
  current, company, invoiceSetting, billFooter, canUpdate,
}: {
  current: string; company: TemplateCompany; invoiceSetting: TemplateInvoiceSetting;
  billFooter: TemplateBillFooter; canUpdate: boolean;
}) {
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const data = sampleData(company, invoiceSetting, billFooter);

  async function choose(id: string) {
    if (!canUpdate || id === selected) return;
    setSaving(id);
    const res = await api("/api/settings/printing-template", { method: "PUT", body: JSON.stringify({ template: id }) });
    setSaving(null);
    if (!res.ok) return toast(res.error.message, "err");
    setSelected(id);
    toast(`${TEMPLATE_OPTIONS.find((t) => t.id === id)?.label} set as the active template`);
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Printing Templates"]} title="Printing Templates" />
      <p className="mb-4 text-sm text-muted">
        Pick the layout Sales and Purchase Invoice print pages use. Selection applies
        immediately — the preview below uses sample data, real invoices render with your
        actual company details, line items, and Bill Footer settings.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_OPTIONS.map((t) => {
          const isActive = selected === t.id;
          return (
            <Card key={t.id} className={`overflow-hidden p-0 ${isActive ? "ring-2 ring-accent" : ""}`}>
              <div className="relative h-56 overflow-hidden border-b border-border bg-neutral-100">
                <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: 700, transform: "scale(0.32)" }}>
                  <div className="bg-white p-6" style={{ width: 700 }}>
                    <InvoiceTemplateRenderer template={t.id} data={data} />
                  </div>
                </div>
                <button
                  onClick={() => setPreviewing(t.id)}
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/75"
                  data-app-chrome
                >
                  <Eye size={12} /> Preview
                </button>
                {isActive && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    <Check size={12} /> Active
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted">{t.size}</div>
                </div>
                <p className="mt-1 text-xs text-muted">{t.description}</p>
                {canUpdate && (
                  <Button
                    variant={isActive ? "outline" : "primary"}
                    className="mt-3 w-full"
                    disabled={isActive}
                    loading={saving === t.id}
                    onClick={() => choose(t.id)}
                  >
                    {isActive ? "Selected" : "Use this template"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {previewing && (
        <Modal open onClose={() => setPreviewing(null)} title={TEMPLATE_OPTIONS.find((t) => t.id === previewing)?.label ?? "Preview"} wide>
          <div className="max-h-[75vh] overflow-y-auto bg-neutral-100 p-6">
            <div className="mx-auto max-w-3xl bg-white p-8 shadow">
              <InvoiceTemplateRenderer template={previewing} data={data} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
