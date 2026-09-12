import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { trialBalance } from "@/server/accounts/gl";
import type { BalanceConfirmationCreate, BalanceConfirmationStatusUpdate } from "./schemas";

const orNull = (v?: string) => (v && v.length ? v : null);

export async function listBalanceConfirmations(companyId: string, opts: { page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.BalanceConfirmationWhereInput = { companyId, deletedAt: null };
  const [rows, total] = await Promise.all([
    db.balanceConfirmation.findMany({
      where,
      orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, asOfDate: true, balance: true, balanceType: true, status: true, notes: true,
        ledger: { select: { name: true, code: true } },
      },
    }),
    db.balanceConfirmation.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      asOfDate: r.asOfDate.toISOString().slice(0, 10),
      ledgerName: r.ledger.name,
      ledgerCode: r.ledger.code,
      balance: r.balance.toFixed(2),
      balanceType: r.balanceType,
      status: r.status,
    })),
    total, page, pageSize,
  };
}

/** Point-in-time balance snapshot sent to a customer/supplier for
 * confirmation (standard audit/reconciliation practice) — computed live
 * from trialBalance() as of the given date, then frozen into the record.
 * Never repostable: it's a statement about a balance, not a transaction. */
export async function createBalanceConfirmation(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: BalanceConfirmationCreate,
) {
  const ledger = await db.ledger.findFirst({ where: { id: input.ledgerId, companyId, deletedAt: null }, select: { id: true } });
  if (!ledger) throw errors.validation(null, "Account not found");

  const asOf = new Date(input.asOfDate);
  const tb = await trialBalance(companyId, fiscalYearId, { asOf });
  const row = tb.allRows.find((r) => r.ledgerId === input.ledgerId);
  const balance = row?.closing ?? "0.00";
  const balanceType = row?.closingType ?? "DR";

  const doc = await db.balanceConfirmation.create({
    data: {
      companyId, ledgerId: input.ledgerId, asOfDate: asOf,
      balance, balanceType, notes: orNull(input.notes), createdById: actorId,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "BalanceConfirmation", entityId: doc.id, meta: { balance, balanceType } });
  return { id: doc.id };
}

export async function updateBalanceConfirmationStatus(
  companyId: string,
  actorId: string,
  id: string,
  input: BalanceConfirmationStatusUpdate,
) {
  const doc = await db.balanceConfirmation.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!doc) throw errors.notFound("Balance confirmation not found");
  await db.balanceConfirmation.update({ where: { id }, data: { status: input.status } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BalanceConfirmation", entityId: id, meta: { status: input.status } });
}
