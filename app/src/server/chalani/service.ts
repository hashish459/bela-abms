import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/server/accounts/gl";
import type { ChalaniCreate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listChalanis(
  companyId: string,
  fiscalYearId: string | null,
  opts: { page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.ChalaniWhereInput = {
    companyId,
    deletedAt: null,
    ...(fiscalYearId ? { fiscalYearId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.chalani.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, customerName: true,
        vehicleNo: true, driverName: true,
        salesDoc: { select: { number: true } },
        items: { select: { qty: true } },
      },
    }),
    db.chalani.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      customer: r.customerName ?? "—",
      vehicleNo: r.vehicleNo ?? "—",
      driverName: r.driverName ?? "—",
      invoiceNumber: r.salesDoc?.number ?? null,
      itemCount: r.items.length,
    })),
    total, page, pageSize,
  };
}

/** Dispatch/delivery register — pure paperwork, no GL or stock impact (the
 * Sales Invoice already owns both). See schema.prisma's Chalani comment. */
export async function createChalani(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: ChalaniCreate,
) {
  return db.$transaction(async (tx) => {
    const customer = orNull(input.customerLedgerId)
      ? await tx.ledger.findFirst({ where: { id: input.customerLedgerId, companyId }, select: { id: true, name: true } })
      : null;
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "chalani:DISPATCH");
    const number = `CH-${fy!.name.replace("-", "/")}-${String(seq).padStart(4, "0")}`;

    const doc = await tx.chalani.create({
      data: {
        companyId, fiscalYearId, number,
        date: new Date(input.date),
        customerLedgerId: customer?.id ?? null,
        customerName: customer?.name ?? orNull(input.customerName),
        salesDocId: orNull(input.salesDocId),
        vehicleNo: orNull(input.vehicleNo),
        driverName: orNull(input.driverName),
        notes: orNull(input.notes),
        createdById: actorId,
        items: {
          create: input.items.map((l, i) => ({
            productId: orNull(l.productId),
            description: l.description,
            qty: l.qty,
            order: i,
          })),
        },
      },
    });
    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Chalani", entityId: doc.id, meta: { number } });
    return { id: doc.id, number };
  });
}
