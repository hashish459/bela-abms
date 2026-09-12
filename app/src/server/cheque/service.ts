import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import type { ChequeCreate, ChequeStatusUpdate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listCheques(
  companyId: string,
  opts: { page?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.ChequeWhereInput = { companyId, deletedAt: null };
  const [rows, total] = await Promise.all([
    db.cheque.findMany({
      where,
      orderBy: [{ chequeDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, chequeNo: true, bankName: true, chequeDate: true, amount: true,
        customerName: true, status: true, notes: true,
        salesDoc: { select: { number: true } },
      },
    }),
    db.cheque.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      chequeNo: r.chequeNo,
      bankName: r.bankName,
      chequeDate: r.chequeDate.toISOString().slice(0, 10),
      amount: r.amount.toFixed(2),
      customer: r.customerName ?? "—",
      status: r.status,
      invoiceNumber: r.salesDoc?.number ?? null,
    })),
    total, page, pageSize,
  };
}

/** Post-dated cheque register — tracks the physical instrument and its
 * clearance status only. No GL posting here: the invoice/receipt that used
 * CHEQUE as its payment mode already booked the money. */
export async function createCheque(
  companyId: string,
  actorId: string,
  input: ChequeCreate,
) {
  const customer = orNull(input.customerLedgerId)
    ? await db.ledger.findFirst({ where: { id: input.customerLedgerId, companyId }, select: { id: true, name: true } })
    : null;
  const cheque = await db.cheque.create({
    data: {
      companyId,
      chequeNo: input.chequeNo,
      bankName: input.bankName,
      chequeDate: new Date(input.chequeDate),
      amount: input.amount,
      customerLedgerId: customer?.id ?? null,
      customerName: customer?.name ?? orNull(input.customerName),
      salesDocId: orNull(input.salesDocId),
      notes: orNull(input.notes),
      createdById: actorId,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Cheque", entityId: cheque.id, meta: { chequeNo: input.chequeNo } });
  return { id: cheque.id };
}

export async function updateChequeStatus(
  companyId: string,
  actorId: string,
  id: string,
  input: ChequeStatusUpdate,
) {
  const cheque = await db.cheque.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!cheque) throw errors.notFound("Cheque not found");
  await db.cheque.update({ where: { id }, data: { status: input.status } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Cheque", entityId: id, meta: { status: input.status } });
}
