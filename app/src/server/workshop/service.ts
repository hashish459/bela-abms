import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";
import { createInvoice } from "@/server/sales/service";
import {
  getCustomFieldValuesForEntities,
  getCustomFieldValuesForEntity,
  prepareCustomFieldValues,
  saveCustomFieldValues,
  summarizeCustomFields,
} from "@/server/custom-fields/service";
import type { TechnicianCreate, JobCardCreate, JobCardBill } from "./schemas";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const orNull = (v?: string) => (v && v.length ? v : null);

/* ────────────────────────────  Technicians  ────────────────────────────── */

export async function listTechnicians(companyId: string, opts: { activeOnly?: boolean } = {}) {
  return db.technician.findMany({
    where: { companyId, deletedAt: null, ...(opts.activeOnly ? { isActive: true } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function createTechnician(companyId: string, actorId: string, input: TechnicianCreate) {
  const created = await db.technician.create({
    data: { companyId, name: input.name, phone: orNull(input.phone), specialization: orNull(input.specialization) },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Technician", entityId: created.id, meta: { name: input.name } });
  return created;
}

export async function updateTechnician(companyId: string, actorId: string, id: string, input: Partial<TechnicianCreate> & { isActive?: boolean }) {
  const existing = await db.technician.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Technician not found");
  const updated = await db.technician.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      phone: input.phone === undefined ? undefined : orNull(input.phone),
      specialization: input.specialization === undefined ? undefined : orNull(input.specialization),
      isActive: input.isActive ?? undefined,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Technician", entityId: id });
  return updated;
}

/* ─────────────────────────────  Job Cards  ─────────────────────────────── */

function itemsTotal(items: { qty: number; rate: number; discount?: number }[]) {
  return items.reduce((a, it) => a.add(D(it.qty).mul(it.rate).sub(it.discount ?? 0)), D(0));
}

export async function createJobCard(companyId: string, fiscalYearId: string, actorId: string, input: JobCardCreate) {
  return db.$transaction(async (tx) => {
    let customerName = orNull(input.customerName);
    if (input.customerLedgerId) {
      const customer = await tx.ledger.findFirst({ where: { id: input.customerLedgerId, companyId, deletedAt: null }, select: { name: true } });
      if (!customer) throw errors.validation(null, "Customer not found");
      customerName = customer.name;
    }

    if (input.items.length) {
      const productIds = [...new Set(input.items.map((i) => orNull(i.productId)).filter(Boolean) as string[])];
      if (productIds.length) {
        const count = await tx.product.count({ where: { id: { in: productIds }, companyId, deletedAt: null } });
        if (count !== productIds.length) throw errors.validation(null, "One or more items reference an unknown product");
      }
      const technicianIds = [...new Set(input.items.map((i) => orNull(i.technicianId)).filter(Boolean) as string[])];
      if (technicianIds.length) {
        const count = await tx.technician.count({ where: { id: { in: technicianIds }, companyId, deletedAt: null } });
        if (count !== technicianIds.length) throw errors.validation(null, "One or more items reference an unknown technician");
      }
    }

    const customFieldValues = await prepareCustomFieldValues(companyId, "JOB_CARD", input.customFields, tx);

    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "workshop:JOB_CARD");
    const number = `JC-${fy!.name.replace("-", "/")}-${String(seq).padStart(4, "0")}`;

    const jobCard = await tx.jobCard.create({
      data: {
        companyId, fiscalYearId, number, date: new Date(input.date),
        customerLedgerId: orNull(input.customerLedgerId), customerName, customerPhone: orNull(input.customerPhone),
        vehicleRegNo: input.vehicleRegNo, vehicleMake: orNull(input.vehicleMake), vehicleModel: orNull(input.vehicleModel),
        odometerReading: input.odometerReading == null ? null : D(input.odometerReading),
        complaint: input.complaint, notes: orNull(input.notes), createdById: actorId,
        items: {
          create: input.items.map((it, i) => ({
            itemType: it.itemType, productId: orNull(it.productId), technicianId: orNull(it.technicianId),
            description: it.description, qty: D(it.qty), rate: D(it.rate), discount: D(it.discount ?? 0),
            taxRateId: orNull(it.taxRateId), isNonTaxable: it.isNonTaxable, order: i,
          })),
        },
      },
      include: { items: true },
    });

    if (customFieldValues.length) await saveCustomFieldValues(tx, companyId, jobCard.id, customFieldValues);

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "JobCard", entityId: jobCard.id, meta: { number, vehicleRegNo: input.vehicleRegNo } });
    return { id: jobCard.id, number: jobCard.number };
  });
}

export async function listJobCards(companyId: string, fiscalYearId: string | null, opts: { status?: string } = {}) {
  const jobCards = await db.jobCard.findMany({
    where: { companyId, ...(fiscalYearId ? { fiscalYearId } : {}), ...(opts.status ? { status: opts.status as never } : {}) },
    orderBy: [{ date: "desc" }, { number: "desc" }],
    include: { items: { select: { qty: true, rate: true, discount: true } } },
  });
  const customByJobCard = await getCustomFieldValuesForEntities(companyId, "JOB_CARD", jobCards.map((jc) => jc.id));
  return jobCards.map((jc) => ({
    id: jc.id, number: jc.number, date: jc.date.toISOString().slice(0, 10),
    customerName: jc.customerName ?? "—", vehicleRegNo: jc.vehicleRegNo,
    vehicleMake: jc.vehicleMake, vehicleModel: jc.vehicleModel, complaint: jc.complaint,
    status: jc.status, invoiceId: jc.invoiceId,
    estimateTotal: itemsTotal(jc.items.map((i) => ({ qty: Number(i.qty), rate: Number(i.rate), discount: Number(i.discount) }))).toFixed(2),
    customFieldsSummary: summarizeCustomFields(customByJobCard.get(jc.id)),
  }));
}

export async function getJobCard(companyId: string, id: string) {
  const jc = await db.jobCard.findFirst({
    where: { id, companyId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!jc) throw errors.notFound("Job card not found");

  const productIds = [...new Set(jc.items.map((i) => i.productId).filter(Boolean) as string[])];
  const technicianIds = [...new Set(jc.items.map((i) => i.technicianId).filter(Boolean) as string[])];
  const [products, technicians] = await Promise.all([
    productIds.length ? db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [],
    technicianIds.length ? db.technician.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } }) : [],
  ]);
  const productById = new Map(products.map((p) => [p.id, p.name]));
  const technicianById = new Map(technicians.map((t) => [t.id, t.name]));

  return {
    id: jc.id, number: jc.number, date: jc.date.toISOString().slice(0, 10),
    customerLedgerId: jc.customerLedgerId, customerName: jc.customerName, customerPhone: jc.customerPhone,
    vehicleRegNo: jc.vehicleRegNo, vehicleMake: jc.vehicleMake, vehicleModel: jc.vehicleModel,
    odometerReading: jc.odometerReading?.toFixed(2) ?? null, complaint: jc.complaint, notes: jc.notes,
    status: jc.status, invoiceId: jc.invoiceId,
    items: jc.items.map((it) => ({
      id: it.id, itemType: it.itemType, productName: it.productId ? (productById.get(it.productId) ?? "—") : null,
      technicianName: it.technicianId ? (technicianById.get(it.technicianId) ?? "—") : null,
      description: it.description, qty: it.qty.toFixed(3), rate: it.rate.toFixed(2), discount: it.discount.toFixed(2),
    })),
    estimateTotal: itemsTotal(jc.items.map((i) => ({ qty: Number(i.qty), rate: Number(i.rate), discount: Number(i.discount) }))).toFixed(2),
    customFieldValues: await getCustomFieldValuesForEntity(companyId, "JOB_CARD", jc.id),
  };
}

/**
 * Completes a job card by posting a real Sales Invoice — this calls the Sales module's own
 * createInvoice() directly, reusing its GL/stock/COGS/VAT logic entirely rather than
 * duplicating it. The final items billed here are what actually gets invoiced; they don't
 * have to match the job card's original intake estimate (real repair work often differs
 * from the initial estimate once the vehicle is inspected).
 */
export async function billJobCard(companyId: string, fiscalYearId: string, actorId: string, jobCardId: string, input: JobCardBill) {
  const jc = await db.jobCard.findFirst({ where: { id: jobCardId, companyId } });
  if (!jc) throw errors.notFound("Job card not found");
  if (jc.status !== "OPEN") throw errors.conflict(`Job card is already ${jc.status.toLowerCase()}`);

  const invoice = await createInvoice(companyId, fiscalYearId, actorId, {
    date: new Date().toISOString().slice(0, 10),
    customerLedgerId: jc.customerLedgerId ?? undefined,
    customerName: jc.customerName ?? undefined,
    invoiceDiscount: input.invoiceDiscount ?? 0,
    notes: `Job Card ${jc.number} — ${jc.vehicleRegNo}`,
    paymentMode: input.paymentMode,
    paymentLedgerId: input.paymentLedgerId || undefined,
    lines: input.items.map((it) => ({
      productId: it.productId || undefined,
      description: it.description,
      qty: it.qty,
      rate: it.rate,
      discount: it.discount ?? 0,
      taxRateId: it.taxRateId || undefined,
      isNonTaxable: it.isNonTaxable,
    })),
  });

  await db.jobCard.update({ where: { id: jc.id }, data: { status: "BILLED", invoiceId: invoice.id } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "JobCard", entityId: jc.id, meta: { billed: true, invoiceNumber: invoice.number } });

  return { invoiceId: invoice.id, invoiceNumber: invoice.number };
}

export async function cancelJobCard(companyId: string, actorId: string, jobCardId: string) {
  const jc = await db.jobCard.findFirst({ where: { id: jobCardId, companyId } });
  if (!jc) throw errors.notFound("Job card not found");
  if (jc.status !== "OPEN") throw errors.conflict(`Job card is already ${jc.status.toLowerCase()}`);

  await db.jobCard.update({ where: { id: jc.id }, data: { status: "CANCELLED" } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "JobCard", entityId: jc.id, meta: { cancelled: true } });
  return { id: jc.id };
}
