"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

const STEPS = [
  { title: "Set your fiscal year", href: "/dashboard/settings/fiscal-year", hint: "Everything else needs an active fiscal year first." },
  { title: "Fill in Company Info", href: "/dashboard/settings/company-info", hint: "Legal name, PAN, address — printed on every invoice letterhead." },
  { title: "Review the Chart of Accounts", href: "/dashboard/accounts/charts-of-accounts", hint: "Ledgers are pre-seeded; add your own where needed." },
  { title: "Add your first product or service", href: "/dashboard/inventory/products", hint: "Products drive Sales, Purchase and Inventory together." },
  { title: "Create a Sales Invoice", href: "/dashboard/sales/invoice", hint: "Posts the sale, VAT, COGS and inventory movement in one step." },
  { title: "Check the Reports catalogue", href: "/dashboard/reports", hint: "Every report drills down to its source voucher." },
  { title: "Invite your team", href: "/dashboard/settings/users", hint: "Create users and assign roles under User & Permissions." },
];

export function TourView() {
  return (
    <>
      <PageHeader crumbs={["Settings", "Tour"]} title="Tour" />
      <p className="mb-4 text-sm text-muted">
        A quick walkthrough of first-time setup, in order. For deeper explanations see Help
        in the sidebar.
      </p>

      <Card className="max-w-2xl overflow-hidden">
        <ol className="divide-y divide-border">
          {STEPS.map((step, i) => (
            <li key={step.href}>
              <Link href={step.href} className="flex items-center gap-3 p-4 hover:bg-accent-tint">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-tint text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted">{step.hint}</div>
                </div>
                <ArrowRight size={14} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <CheckCircle2 size={13} /> Come back to this page any time — nothing here is one-shot.
      </p>
    </>
  );
}
