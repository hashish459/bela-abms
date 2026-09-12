import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";
import type { ImportShipmentCreate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listImportShipments(
  companyId: string,
  fiscalYearId: string | null,
  opts: { page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.ImportShipmentWhereInput = {
    companyId,
    deletedAt: null,
    ...(fiscalYearId ? { fiscalYearId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.importShipment.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, supplierName: true, countryOfOrigin: true,
        billOfEntryNo: true, portOfEntry: true,
        purchaseInvoice: { select: { number: true } },
      },
    }),
    db.importShipment.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      supplier: r.supplierName ?? "—",
      countryOfOrigin: r.countryOfOrigin ?? "—",
      billOfEntryNo: r.billOfEntryNo ?? "—",
      portOfEntry: r.portOfEntry ?? "—",
      purchaseInvoiceNumber: r.purchaseInvoice?.number ?? null,
    })),
    total, page, pageSize,
  };
}

/** Customs/compliance register (Purchase › Imports) — the linked Purchase
 * Invoice already carries the customs/excise duty for landed-cost valuation
 * (src/server/purchase/service.ts); this is a compliance-side record on top
 * of that (bill of entry, country, port), not a second posting path. */
export async function createImportShipment(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: ImportShipmentCreate,
) {
  return db.$transaction(async (tx) => {
    const supplier = orNull(input.supplierLedgerId)
      ? await tx.ledger.findFirst({ where: { id: input.supplierLedgerId, companyId }, select: { id: true, name: true } })
      : null;
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "import_shipment:IMP");
    const number = `IMP-${fy!.name.replace("-", "/")}-${String(seq).padStart(4, "0")}`;

    const doc = await tx.importShipment.create({
      data: {
        companyId, fiscalYearId, number,
        date: new Date(input.date),
        supplierLedgerId: supplier?.id ?? null,
        supplierName: supplier?.name ?? orNull(input.supplierName),
        countryOfOrigin: orNull(input.countryOfOrigin),
        billOfEntryNo: orNull(input.billOfEntryNo),
        portOfEntry: orNull(input.portOfEntry),
        purchaseInvoiceId: orNull(input.purchaseInvoiceId),
        notes: orNull(input.notes),
        createdById: actorId,
      },
    });
    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "ImportShipment", entityId: doc.id, meta: { number } });
    return { id: doc.id, number };
  });
}
