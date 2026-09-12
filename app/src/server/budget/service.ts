import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import type {
  BudgetHeadingCreate, BudgetHeadingUpdate, BudgetFundCreate, BudgetFundUpdate,
  BudgetCreate, BudgetUpdate, AllocationSet,
} from "./schemas";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
const orNull = (v?: string) => (v && v.length ? v : null);

/* ─────────────────────────────  Budget Heading  ─────────────────────────── */

export async function listBudgetHeadings(companyId: string) {
  const rows = await db.budgetHeading.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { accountGroup: { select: { name: true, code: true } } },
  });
  return rows.map((r) => ({
    id: r.id, name: r.name, sourceType: r.sourceType, isActive: r.isActive,
    accountGroupId: r.accountGroupId,
    accountGroupName: r.accountGroup ? `${r.accountGroup.name} (${r.accountGroup.code})` : null,
  }));
}

export async function createBudgetHeading(companyId: string, actorId: string, input: BudgetHeadingCreate) {
  const dup = await db.budgetHeading.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Budget heading "${input.name}" already exists`);
  if (input.sourceType === "COA_GROUP" && !orNull(input.accountGroupId)) {
    throw errors.validation(null, "Select an account group for a COA-linked heading");
  }
  const created = await db.budgetHeading.create({
    data: {
      companyId, name: input.name, sourceType: input.sourceType,
      accountGroupId: input.sourceType === "COA_GROUP" ? orNull(input.accountGroupId) : null,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "BudgetHeading", entityId: created.id });
  return created;
}

export async function updateBudgetHeading(companyId: string, actorId: string, id: string, input: BudgetHeadingUpdate) {
  const existing = await db.budgetHeading.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Budget heading not found");
  await db.budgetHeading.update({
    where: { id },
    data: {
      name: input.name,
      sourceType: input.sourceType,
      accountGroupId: input.sourceType === undefined ? undefined : input.sourceType === "COA_GROUP" ? orNull(input.accountGroupId) : null,
      isActive: input.isActive,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BudgetHeading", entityId: id });
}

export async function deleteBudgetHeading(companyId: string, actorId: string, id: string) {
  const existing = await db.budgetHeading.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { allocations: { select: { id: true } } },
  });
  if (!existing) throw errors.notFound("Budget heading not found");
  if (existing.allocations.length) throw errors.conflict("Remove this heading's allocations before deleting it");
  await db.budgetHeading.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "BudgetHeading", entityId: id });
}

/* ───────────────────────────────  Budget Fund  ───────────────────────────── */

export async function listBudgetFunds(companyId: string) {
  return db.budgetFund.findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } });
}

export async function createBudgetFund(companyId: string, actorId: string, input: BudgetFundCreate) {
  const dup = await db.budgetFund.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Fund "${input.name}" already exists`);
  const created = await db.budgetFund.create({ data: { companyId, name: input.name } });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "BudgetFund", entityId: created.id });
  return created;
}

export async function updateBudgetFund(companyId: string, actorId: string, id: string, input: BudgetFundUpdate) {
  const existing = await db.budgetFund.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Fund not found");
  await db.budgetFund.update({ where: { id }, data: { name: input.name, isActive: input.isActive } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BudgetFund", entityId: id });
}

export async function deleteBudgetFund(companyId: string, actorId: string, id: string) {
  const existing = await db.budgetFund.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { budgets: { select: { id: true } } },
  });
  if (!existing) throw errors.notFound("Fund not found");
  if (existing.budgets.length) throw errors.conflict("Unassign this fund from all budgets before deleting it");
  await db.budgetFund.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "BudgetFund", entityId: id });
}

/* ──────────────────────────────────  Budget  ─────────────────────────────── */

export async function listBudgets(companyId: string) {
  const rows = await db.budget.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      fiscalYear: { select: { name: true } },
      fund: { select: { name: true } },
      allocations: { select: { amount: true } },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    fiscalYearId: b.fiscalYearId,
    fiscalYearName: b.fiscalYear.name,
    fundName: b.fund?.name ?? null,
    notes: b.notes,
    isActive: b.isActive,
    totalAllocated: r2(b.allocations.reduce((a, x) => a.add(x.amount), D(0))),
  }));
}

export async function createBudget(companyId: string, actorId: string, input: BudgetCreate) {
  const fy = await db.fiscalYear.findFirst({ where: { id: input.fiscalYearId, companyId } });
  if (!fy) throw errors.validation(null, "Invalid fiscal year");
  const dup = await db.budget.findFirst({ where: { companyId, fiscalYearId: input.fiscalYearId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Budget "${input.name}" already exists for ${fy.name}`);

  const created = await db.budget.create({
    data: {
      companyId, fiscalYearId: input.fiscalYearId, name: input.name,
      fundId: orNull(input.fundId), notes: orNull(input.notes), createdById: actorId,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Budget", entityId: created.id });
  return created;
}

export async function updateBudget(companyId: string, actorId: string, id: string, input: BudgetUpdate) {
  const existing = await db.budget.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Budget not found");
  await db.budget.update({
    where: { id },
    data: {
      name: input.name,
      fundId: input.fundId === undefined ? undefined : orNull(input.fundId),
      notes: input.notes === undefined ? undefined : orNull(input.notes),
      isActive: input.isActive,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Budget", entityId: id });
}

export async function deleteBudget(companyId: string, actorId: string, id: string) {
  const existing = await db.budget.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Budget not found");
  await db.budget.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "Budget", entityId: id });
}

/* ────────────────────────────────  Allocation  ───────────────────────────── */

/** The budget's headings with their current allocation (0 if none yet) — the
 * shape the Allocation editor renders as an editable amount-per-heading list. */
export async function getBudgetAllocations(companyId: string, budgetId: string) {
  const budget = await db.budget.findFirst({
    where: { id: budgetId, companyId, deletedAt: null },
    include: { fiscalYear: { select: { name: true } }, fund: { select: { name: true } } },
  });
  if (!budget) throw errors.notFound("Budget not found");

  const [headings, allocations] = await Promise.all([
    db.budgetHeading.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      include: { accountGroup: { select: { name: true, code: true } } },
    }),
    db.budgetAllocation.findMany({ where: { budgetId } }),
  ]);
  const amountByHeading = new Map(allocations.map((a) => [a.budgetHeadingId, a.amount]));

  return {
    budget: { id: budget.id, name: budget.name, fiscalYearName: budget.fiscalYear.name, fundName: budget.fund?.name ?? null },
    rows: headings.map((h) => ({
      budgetHeadingId: h.id,
      name: h.name,
      sourceType: h.sourceType,
      accountGroupName: h.accountGroup ? `${h.accountGroup.name} (${h.accountGroup.code})` : null,
      amount: r2(D(amountByHeading.get(h.id) ?? 0)),
    })),
  };
}

export async function setBudgetAllocations(companyId: string, actorId: string, budgetId: string, input: AllocationSet) {
  const budget = await db.budget.findFirst({ where: { id: budgetId, companyId, deletedAt: null } });
  if (!budget) throw errors.notFound("Budget not found");

  const headingIds = input.allocations.map((a) => a.budgetHeadingId);
  const validHeadings = headingIds.length
    ? await db.budgetHeading.findMany({ where: { id: { in: headingIds }, companyId, deletedAt: null }, select: { id: true } })
    : [];
  const validIds = new Set(validHeadings.map((h) => h.id));

  await db.$transaction(
    input.allocations
      .filter((a) => validIds.has(a.budgetHeadingId))
      .map((a) =>
        db.budgetAllocation.upsert({
          where: { budgetId_budgetHeadingId: { budgetId, budgetHeadingId: a.budgetHeadingId } },
          create: { budgetId, budgetHeadingId: a.budgetHeadingId, amount: D(a.amount) },
          update: { amount: D(a.amount) },
        }),
      ),
  );
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Budget", entityId: budgetId, meta: { allocations: input.allocations.length } });
}

/* ───────────────────────────  Budget vs Expense report  ─────────────────── */

export async function budgetVsExpenseReport(companyId: string, budgetId: string) {
  const budget = await db.budget.findFirst({
    where: { id: budgetId, companyId, deletedAt: null },
    include: { fiscalYear: { select: { id: true, name: true, startDate: true, endDate: true } } },
  });
  if (!budget) throw errors.notFound("Budget not found");

  const allocations = await db.budgetAllocation.findMany({
    where: { budgetId },
    include: {
      budgetHeading: {
        include: { accountGroup: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  const groupIds = allocations
    .map((a) => a.budgetHeading.accountGroupId)
    .filter((id): id is string => !!id);

  const actualByGroup = new Map<string, Prisma.Decimal>();
  if (groupIds.length) {
    const ledgers = await db.ledger.findMany({ where: { accountGroupId: { in: groupIds } }, select: { id: true, accountGroupId: true } });
    const ledgerIds = ledgers.map((l) => l.id);
    const movements = ledgerIds.length
      ? await db.voucherLine.groupBy({
          by: ["ledgerId"],
          where: {
            ledgerId: { in: ledgerIds },
            voucher: { companyId, fiscalYearId: budget.fiscalYearId, date: { gte: budget.fiscalYear.startDate, lte: budget.fiscalYear.endDate } },
          },
          _sum: { debit: true, credit: true },
        })
      : [];
    const groupByLedger = new Map(ledgers.map((l) => [l.id, l.accountGroupId!]));
    for (const m of movements) {
      const groupId = groupByLedger.get(m.ledgerId);
      if (!groupId) continue;
      // Expense-side actual: debit - credit (natural debit balance for EX-type groups).
      const net = D(m._sum.debit ?? 0).sub(m._sum.credit ?? 0);
      actualByGroup.set(groupId, (actualByGroup.get(groupId) ?? D(0)).add(net));
    }
  }

  let totalAllocated = D(0);
  let totalActual = D(0);
  const rows = allocations.map((a) => {
    const allocated = D(a.amount);
    const actual = a.budgetHeading.accountGroupId ? actualByGroup.get(a.budgetHeading.accountGroupId) ?? D(0) : null;
    totalAllocated = totalAllocated.add(allocated);
    if (actual) totalActual = totalActual.add(actual);
    const variance = actual !== null ? allocated.sub(actual) : null;
    return {
      budgetHeadingId: a.budgetHeadingId,
      name: a.budgetHeading.name,
      sourceType: a.budgetHeading.sourceType,
      allocated: r2(allocated),
      actual: actual !== null ? r2(actual) : null,
      variance: variance !== null ? r2(variance) : null,
      utilizationPct: actual !== null && allocated.gt(0) ? actual.div(allocated).mul(100).toDecimalPlaces(1).toFixed(1) : null,
    };
  });

  return {
    budget: { id: budget.id, name: budget.name, fiscalYearName: budget.fiscalYear.name },
    rows,
    totals: { allocated: r2(totalAllocated), actual: r2(totalActual), variance: r2(totalAllocated.sub(totalActual)) },
  };
}
