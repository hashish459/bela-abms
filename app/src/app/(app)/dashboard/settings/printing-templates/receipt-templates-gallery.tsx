"use client";

import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { api, Button, Card, Modal, toast } from "@/components/ui";
import {
  ReceiptTemplateRenderer,
  RECEIPT_TEMPLATE_OPTIONS,
  type ReceiptTemplateData,
} from "@/components/receipt-templates";
import type { TemplateCompany } from "@/components/invoice-templates";

function sampleData(company: TemplateCompany): ReceiptTemplateData {
  return {
    number: "RC-2083/84-0042",
    date: "2026-09-12 (BS 2083-05-27)",
    fiscalYearName: "2083-84",
    customerName: "Everest Retail Store",
    customerPan: "601234567",
    amount: "12,260.50",
    paymentMode: "CASH",
    paymentLedgerName: "Cash In Hand",
    againstNumber: "SA-2083/84-0042",
    reference: null,
    notes: null,
    company,
    authorizedSignatory: null,
  };
}

export function ReceiptTemplatesGallery({
  current, company, canUpdate,
}: {
  current: string; company: TemplateCompany; canUpdate: boolean;
}) {
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const data = sampleData(company);

  async function choose(id: string) {
    if (!canUpdate || id === selected) return;
    setSaving(id);
    const res = await api("/api/settings/receipt-template", { method: "PUT", body: JSON.stringify({ receiptTemplate: id }) });
    setSaving(null);
    if (!res.ok) return toast(res.error.message, "err");
    setSelected(id);
    toast(`${RECEIPT_TEMPLATE_OPTIONS.find((t) => t.id === id)?.label} set as the active receipt template`);
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Pick the layout the Receipt print page uses. Selection applies immediately — the
        preview below uses sample data, real receipts render with your actual company details.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECEIPT_TEMPLATE_OPTIONS.map((t) => {
          const isActive = selected === t.id;
          return (
            <Card key={t.id} className={`overflow-hidden p-0 ${isActive ? "ring-2 ring-accent" : ""}`}>
              <div className="relative h-56 overflow-hidden border-b border-border bg-neutral-100">
                <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: 500, transform: "scale(0.42)" }}>
                  <div className="bg-white p-6" style={{ width: 500 }}>
                    <ReceiptTemplateRenderer template={t.id} data={data} />
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
        <Modal open onClose={() => setPreviewing(null)} title={RECEIPT_TEMPLATE_OPTIONS.find((t) => t.id === previewing)?.label ?? "Preview"} wide>
          <div className="max-h-[75vh] overflow-y-auto bg-neutral-100 p-6">
            <div className="mx-auto max-w-2xl bg-white p-8 shadow">
              <ReceiptTemplateRenderer template={previewing} data={data} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
