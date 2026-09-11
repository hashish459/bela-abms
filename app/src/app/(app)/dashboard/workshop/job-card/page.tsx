import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listJobCards, listTechnicians } from "@/server/workshop/service";
import { listContacts } from "@/server/accounts/service";
import { JobCardWorkspace } from "./job-card-workspace";

export const metadata = { title: "Job Card — Bela ABMS" };

export default async function JobCardPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "workshop.job_card", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [jobCards, customers, technicians, products, taxRates, cashBank] = await Promise.all([
    fyId ? listJobCards(s.companyId!, fyId) : [],
    listContacts(s.companyId!, "CUSTOMER"),
    listTechnicians(s.companyId!, { activeOnly: true }),
    db.product.findMany({
      where: { companyId: s.companyId!, deletedAt: null, kind: { in: ["GOODS", "SERVICE"] } },
      select: { id: true, name: true, kind: true, sellingPrice: true, taxRateId: true, isNonTaxable: true },
      orderBy: { name: "asc" },
    }),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
    db.ledger.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true, accountGroup: { accountHead: { code: "CCE" } } },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <JobCardWorkspace
      initial={jobCards}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
      parts={products.filter((p) => p.kind === "GOODS").map((p) => ({ id: p.id, name: p.name, sellingPrice: p.sellingPrice.toFixed(2) }))}
      services={products.filter((p) => p.kind === "SERVICE").map((p) => ({ id: p.id, name: p.name, sellingPrice: p.sellingPrice.toFixed(2) }))}
      taxRates={taxRates.map((t) => ({ id: t.id, name: t.name, ratePct: Number(t.ratePct), isNoTax: t.isNoTax }))}
      cashBank={cashBank}
      canCreate={can(s.permissions, "workshop.job_card", "create")}
      canBill={can(s.permissions, "workshop.job_card", "update")}
      hasFiscalYear={!!fyId}
    />
  );
}
