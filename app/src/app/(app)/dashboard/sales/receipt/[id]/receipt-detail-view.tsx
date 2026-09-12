"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ReceiptTemplateRenderer, type ReceiptTemplateData } from "@/components/receipt-templates";

export function ReceiptDetailView({ template, data }: { template: string; data: ReceiptTemplateData }) {
  return (
    <>
      <PageHeader
        crumbs={["Sales", "Receipts", data.number]}
        title={data.number}
        action={
          <div className="flex items-center gap-2" data-app-chrome>
            <Link href="/dashboard/sales/receipt">
              <Button variant="outline">
                <ArrowLeft size={14} /> Back
              </Button>
            </Link>
            <PrintButton />
          </div>
        }
      />

      <Card className="mx-auto max-w-2xl p-6 print:border-0 print:p-0 print:shadow-none">
        <ReceiptTemplateRenderer template={template} data={data} />
      </Card>
    </>
  );
}
