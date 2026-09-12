"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { PrintingTemplatesGallery } from "./printing-templates-gallery";
import { ReceiptTemplatesGallery } from "./receipt-templates-gallery";
import type { TemplateCompany, TemplateBillFooter, TemplateInvoiceSetting } from "@/components/invoice-templates";

type Tab = "INVOICE" | "RECEIPT";
const TAB_LABEL: Record<Tab, string> = { INVOICE: "Sales / Purchase Invoice", RECEIPT: "Receipt" };

export function PrintingTemplatesTabs({
  invoiceTemplate, receiptTemplate, company, invoiceSetting, billFooter, canUpdate,
}: {
  invoiceTemplate: string; receiptTemplate: string; company: TemplateCompany;
  invoiceSetting: TemplateInvoiceSetting; billFooter: TemplateBillFooter; canUpdate: boolean;
}) {
  const [tab, setTab] = useState<Tab>("INVOICE");

  return (
    <>
      <PageHeader crumbs={["Settings", "Printing Templates"]} title="Printing Templates" />

      <div className="mb-4 inline-flex rounded-lg bg-background p-1 ring-1 ring-border">
        {(["INVOICE", "RECEIPT"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              tab === t ? "bg-surface shadow-sm" : "text-muted"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "INVOICE" ? (
        <PrintingTemplatesGallery current={invoiceTemplate} company={company} invoiceSetting={invoiceSetting} billFooter={billFooter} canUpdate={canUpdate} />
      ) : (
        <ReceiptTemplatesGallery current={receiptTemplate} company={company} canUpdate={canUpdate} />
      )}
    </>
  );
}
