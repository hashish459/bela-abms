import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { postVoucher, nextNumber, formatVoucherNumber } from "@/server/accounts/gl";
import { postStockMovement, resolveOrCreateBatch } from "@/server/inventory/stock";
import { getCustomFieldValuesForEntity, prepareCustomFieldValues, saveCustomFieldValues } from "@/server/custom-fields/service";
import { calcPurchaseTotals, type PurchaseCalcLineInput } from "./calc";
import type {
  DebitNoteCreate,
  PurchaseInvoiceCreate,
  PurchaseOrderCreate,
} from "./schemas";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const orNull = (v?: string) => (v && v.length ? v : null);

/** System ledger codes we post to (seeded NFRS COA). */
const LEDGER = {
  INVENTORY: "INV-01-0001", // Finished Inventory — FINISHED_GOODS lines land here
  RAW_MATERIAL_INVENTORY: "INV-02-0001", // Raw Material Inventory — RAW_MATERIAL lines land here
  PURCHASE_EXPENSE: "COS-01-0001", // "Purchase" — non-goods / no-product lines
  VAT_RECEIVABLE: "ONFA-C-06-0001", // Vat Receivable (input VAT)
};

/** FINISHED_GOODS (the default, and every product created before this field existed) keeps
 * landing on Finished Inventory exactly as before; only an explicitly-flagged RAW_MATERIAL
 * product routes to the dedicated Raw Material Inventory ledger. */
function inventoryLedgerCodeFor(role?: string): string {
  return role === "RAW_MATERIAL" ? LEDGER.RAW_MATERIAL_INVENTORY : LEDGER.INVENTORY;
}

async function ledgerId(tx: Tx, companyId: string, code: string): Promise<string> {
  const l = await tx.ledger.findFirst({ where: { companyId, code, deletedAt: null }, select: { id: true } });
  if (!l) throw errors.validation(null, `System account ${code} is missing — re-run the seed`);
  return l.id;
}

async function buildCalcLines(
  tx: Tx,
  companyId: string,
  lines: {
    productId?: string;
    taxRateId?: string;
    isNonTaxable?: boolean;
    qty: number;
    rate: number;
    discount?: number;
    exciseDuty?: number;
    customDuty?: number;
  }[],
) {
  const taxIds = [...new Set(lines.map((l) => orNull(l.taxRateId)).filter(Boolean) as string[])];
  const rates = taxIds.length
    ? await tx.taxRate.findMany({ where: { id: { in: taxIds }, companyId }, select: { id: true, ratePct: true, isNoTax: true } })
    : [];
  const rateById = new Map(rates.map((r) => [r.id, r]));

  const productIds = [...new Set(lines.map((l) => orNull(l.productId)).filter(Boolean) as string[])];
  const products = productIds.length
    ? await tx.product.findMany({ where: { id: { in: productIds }, companyId, deletedAt: null }, select: { id: true, kind: true, isNonTaxable: true, inventoryRole: true } })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  return lines.map((l): PurchaseCalcLineInput & { productKind?: string; inventoryRole?: string; taxRatePct: number } => {
    const rate = orNull(l.taxRateId) ? rateById.get(l.taxRateId!) : undefined;
    const product = orNull(l.productId) ? productById.get(l.productId!) : undefined;
    const nonTaxable = l.isNonTaxable || !!rate?.isNoTax || !!product?.isNonTaxable || !rate;
    return {
      qty: l.qty,
      rate: l.rate,
      discount: l.discount ?? 0,
      exciseDuty: l.exciseDuty ?? 0,
      customDuty: l.customDuty ?? 0,
      taxRatePct: rate ? Number(rate.ratePct) : 0,
      isNonTaxable: nonTaxable,
      inventoryRole: product?.inventoryRole,
      productKind: product?.kind,
    };
  });
}

/* ─────────────────────────────  Purchase Order (draft)  ────────────── */

export async function createPurchaseOrder(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: PurchaseOrderCreate,
) {
  return db.$transaction(async (tx) => {
    const supplier = await tx.ledger.findFirst({
      where: { id: input.supplierLedgerId, companyId, deletedAt: null },
      select: { id: true, name: true, panNumber: true },
    });
    if (!supplier) throw errors.validation(null, "Supplier not found");

    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcPurchaseTotals(calcLines, input.invoiceDiscount ?? 0);
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "purchase:PURCHASE_ORDER");
    const number = formatVoucherNumber("PURCHASE", fy!.name, seq).replace(/^PU-/, "PO-");

    const doc = await tx.purchaseDoc.create({
      data: {
        companyId, fiscalYearId, type: "PURCHASE_ORDER", number,
        date: new Date(input.date),
        supplierLedgerId: supplier.id, supplierName: supplier.name, supplierPan: supplier.panNumber,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        referenceNo: orNull(input.referenceNo),
        notes: orNull(input.notes),
        invoiceDiscount: D(totals.invoiceDiscount),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
        totalExciseDuty: D(totals.totalExciseDuty),
        totalCustomDuty: D(totals.totalCustomDuty),
        nonTaxableTotal: D(totals.nonTaxableTotal),
        taxableTotal: D(totals.taxableTotal),
        vatAmount: D(totals.vatAmount),
        grandTotal: D(totals.grandTotal),
        status: "DRAFT",
        createdById: actorId,
        items: {
          create: input.lines.map((l, i) => ({
            productId: orNull(l.productId),
            description: l.description,
            hsCode: orNull(l.hsCode),
            warehouseId: orNull(l.warehouseId),
            qty: D(l.qty), rate: D(l.rate), discount: D(l.discount ?? 0),
            exciseDuty: D(l.exciseDuty ?? 0), customDuty: D(l.customDuty ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            landedAmount: D(totals.lines[i].capitalizedAmount),
            landedUnitCost: D(totals.lines[i].landedUnitCost),
            lineVat: D(totals.lines[i].lineVat),
            order: i,
          })),
        },
      },
    });
    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "PurchaseDoc", entityId: doc.id, meta: { type: "PURCHASE_ORDER", number } });
    return doc;
  });
}

/* ─────────────────────────────  Purchase Invoice  ───────────────────── */

export async function createPurchaseInvoice(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: PurchaseInvoiceCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true, isClosed: true } });
    if (!fy) throw errors.badRequest("Invalid fiscal year");
    if (fy.isClosed) throw errors.badRequest("Fiscal year is closed");

    const supplier = await tx.ledger.findFirst({
      where: { id: input.supplierLedgerId, companyId, deletedAt: null },
      select: { id: true, name: true, panNumber: true },
    });
    if (!supplier) throw errors.validation(null, "Supplier not found");

    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcPurchaseTotals(calcLines, input.invoiceDiscount ?? 0);
    if (D(totals.grandTotal).lte(0))
      throw errors.validation(null, "Invoice total must be greater than zero");

    const customFieldValues = await prepareCustomFieldValues(companyId, "PURCHASE_INVOICE", input.customFields, tx);

    const seq = await nextNumber(tx, companyId, fiscalYearId, "purchase:INVOICE");
    const number = formatVoucherNumber("PURCHASE", fy.name, seq); // PU-2083/84-0001

    const defaultWh = await tx.warehouse.findFirst({
      where: { companyId, deletedAt: null }, orderBy: { isDefault: "desc" }, select: { id: true },
    });

    // Batch is optional per line: only GOODS lines with a batch number typed in get one.
    // Resolved up front (find-or-create) since Prisma's nested `items.create` below can't
    // itself run async lookups per row.
    const batchIds: (string | null)[] = await Promise.all(
      input.lines.map(async (l, i) => {
        const batchNo = orNull(l.batchNo);
        const warehouseId = orNull(l.warehouseId) ?? defaultWh?.id;
        if (!batchNo || !warehouseId || calcLines[i].productKind !== "GOODS" || !orNull(l.productId)) return null;
        return resolveOrCreateBatch(tx, {
          companyId,
          productId: l.productId!,
          warehouseId,
          batchNo,
          expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
        });
      }),
    );

    const notCredit = input.paymentMode !== "CREDIT";
    const paymentLedgerId = notCredit ? orNull(input.paymentLedgerId)! : null;

    const doc = await tx.purchaseDoc.create({
      data: {
        companyId, fiscalYearId, type: "INVOICE", number,
        date: new Date(input.date),
        supplierLedgerId: supplier.id, supplierName: supplier.name, supplierPan: supplier.panNumber,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        referenceNo: orNull(input.referenceNo),
        paymentMode: input.paymentMode, paymentLedgerId,
        notes: orNull(input.notes),
        convertedFromId: orNull(input.convertedFromId),
        invoiceDiscount: D(totals.invoiceDiscount),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
        totalExciseDuty: D(totals.totalExciseDuty),
        totalCustomDuty: D(totals.totalCustomDuty),
        nonTaxableTotal: D(totals.nonTaxableTotal),
        taxableTotal: D(totals.taxableTotal),
        vatAmount: D(totals.vatAmount),
        grandTotal: D(totals.grandTotal),
        amountPaid: notCredit ? D(totals.grandTotal) : D(0),
        status: notCredit ? "PAID" : "OPEN",
        createdById: actorId,
        items: {
          create: input.lines.map((l, i) => ({
            productId: orNull(l.productId),
            description: l.description,
            hsCode: orNull(l.hsCode),
            warehouseId: orNull(l.warehouseId) ?? defaultWh?.id ?? null,
            qty: D(l.qty), rate: D(l.rate), discount: D(l.discount ?? 0),
            exciseDuty: D(l.exciseDuty ?? 0), customDuty: D(l.customDuty ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            landedAmount: D(totals.lines[i].capitalizedAmount),
            landedUnitCost: D(totals.lines[i].landedUnitCost),
            lineVat: D(totals.lines[i].lineVat),
            batchId: batchIds[i],
            order: i,
          })),
        },
      },
      include: { items: true },
    });

    // 1. stock IN for goods lines, valued at landed unit cost (goods price + duty)
    const goodsLines = doc.items.filter(
      (it, i) => calcLines[i].productKind === "GOODS" && it.productId && it.warehouseId,
    );
    if (goodsLines.length) {
      await postStockMovement(tx, {
        companyId, fiscalYearId, date: new Date(input.date), kind: "PURCHASE",
        sourceType: "PurchaseDoc", sourceId: doc.id, createdById: actorId, allowNegative: true,
        lines: goodsLines.map((it) => ({
          productId: it.productId!, warehouseId: it.warehouseId!, batchId: it.batchId,
          qty: it.qty.toString(), unitCost: it.landedUnitCost.toString(),
        })),
      });
    }

    // 2. non-goods lines (service/expense/no-product) are expensed directly
    const expenseLines = doc.items.filter((it, i) => calcLines[i].productKind !== "GOODS");
    const expenseTotal = expenseLines.reduce((a, it) => a.add(it.landedAmount), D(0));

    // goods lines split by inventory role — FINISHED_GOODS (the default) keeps landing on
    // Finished Inventory exactly as before; RAW_MATERIAL lands on Raw Material Inventory.
    const inventoryByLedger = new Map<string, Prisma.Decimal>();
    goodsLines.forEach((it) => {
      const idx = doc.items.indexOf(it);
      const code = inventoryLedgerCodeFor(calcLines[idx].inventoryRole);
      inventoryByLedger.set(code, (inventoryByLedger.get(code) ?? D(0)).add(it.landedAmount));
    });

    // 3. purchase voucher: Dr Inventory (per role) + Dr Purchase Expense + Dr Input VAT / Cr Supplier
    const debitLines: { ledgerId: string; debit: string }[] = [];
    for (const [code, amount] of inventoryByLedger) {
      if (amount.gt(0)) debitLines.push({ ledgerId: await ledgerId(tx, companyId, code), debit: amount.toFixed(2) });
    }
    if (expenseTotal.gt(0))
      debitLines.push({ ledgerId: await ledgerId(tx, companyId, LEDGER.PURCHASE_EXPENSE), debit: expenseTotal.toFixed(2) });
    if (D(totals.vatAmount).gt(0))
      debitLines.push({ ledgerId: await ledgerId(tx, companyId, LEDGER.VAT_RECEIVABLE), debit: totals.vatAmount });

    const purchaseVoucher = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "PURCHASE",
      narration: `Purchase invoice ${number} (supplier bill ${input.supplierInvoiceNumber})`,
      sourceType: "PurchaseDoc", sourceId: doc.id, createdById: actorId,
      lines: [
        ...debitLines,
        { ledgerId: supplier.id, credit: totals.grandTotal, narration: supplier.name },
      ],
    });

    // 4. paid immediately → also record a Supplier Payment so AP reports stay consistent
    let paymentNumber: string | null = null;
    if (notCredit) {
      const pSeq = await nextNumber(tx, companyId, fiscalYearId, "purchase:PAYMENT");
      paymentNumber = formatVoucherNumber("PAYMENT", fy.name, pSeq);
      const pVoucher = await postVoucher(tx, {
        companyId, fiscalYearId, date: new Date(input.date), type: "PAYMENT",
        narration: `Payment ${paymentNumber} against ${number}`,
        sourceType: "SupplierPayment", sourceId: doc.id, createdById: actorId,
        lines: [
          { ledgerId: supplier.id, debit: totals.grandTotal, narration: supplier.name },
          { ledgerId: paymentLedgerId!, credit: totals.grandTotal },
        ],
      });
      await tx.supplierPayment.create({
        data: {
          companyId, fiscalYearId, number: paymentNumber, date: new Date(input.date),
          supplierLedgerId: supplier.id, paymentLedgerId: paymentLedgerId!,
          againstDocId: doc.id, amount: D(totals.grandTotal),
          paymentMode: input.paymentMode, voucherId: pVoucher.id, createdById: actorId,
        },
      });
    }

    if (customFieldValues.length) await saveCustomFieldValues(tx, companyId, doc.id, customFieldValues);

    const finalDoc = await tx.purchaseDoc.update({ where: { id: doc.id }, data: { voucherId: purchaseVoucher.id } });

    if (orNull(input.convertedFromId))
      await tx.purchaseDoc.update({ where: { id: input.convertedFromId }, data: { status: "CONVERTED" } });

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "PurchaseInvoice", entityId: doc.id,
      meta: { number, grandTotal: totals.grandTotal },
    });

    return { id: finalDoc.id, number, grandTotal: totals.grandTotal, paymentNumber };
  });
}

/* ────────────────────────────  Supplier Payment  ─────────────────────── */

export async function createSupplierPayment(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: { date: string; supplierLedgerId: string; paymentLedgerId: string; againstDocId?: string; amount: number; paymentMode: string; reference?: string; notes?: string },
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "purchase:PAYMENT");
    const number = formatVoucherNumber("PAYMENT", fy!.name, seq);

    const supplier = await tx.ledger.findFirst({ where: { id: input.supplierLedgerId, companyId, deletedAt: null }, select: { id: true, name: true } });
    if (!supplier) throw errors.validation(null, "Supplier not found");

    let against = null;
    if (orNull(input.againstDocId)) {
      against = await tx.purchaseDoc.findFirst({
        where: { id: input.againstDocId, companyId, type: "INVOICE" },
        select: { id: true, grandTotal: true, amountPaid: true, number: true },
      });
      if (!against) throw errors.validation(null, "Invoice not found");
      const outstanding = D(against.grandTotal).sub(against.amountPaid);
      if (D(input.amount).gt(outstanding.add(0.01)))
        throw errors.validation(null, `Payment ${input.amount} exceeds the ${outstanding.toFixed(2)} outstanding on ${against.number}`);
    }

    const voucher = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "PAYMENT",
      narration: `Payment ${number}${against ? ` against ${against.number}` : ""}`,
      sourceType: "SupplierPayment", sourceId: number, createdById: actorId,
      lines: [
        { ledgerId: supplier.id, debit: input.amount.toString(), narration: supplier.name },
        { ledgerId: input.paymentLedgerId, credit: input.amount.toString() },
      ],
    });

    const payment = await tx.supplierPayment.create({
      data: {
        companyId, fiscalYearId, number, date: new Date(input.date),
        supplierLedgerId: supplier.id, paymentLedgerId: input.paymentLedgerId,
        againstDocId: against?.id ?? null, amount: D(input.amount),
        paymentMode: input.paymentMode as never, reference: orNull(input.reference),
        notes: orNull(input.notes), voucherId: voucher.id, createdById: actorId,
      },
    });

    if (against) {
      const paid = D(against.amountPaid).add(input.amount);
      await tx.purchaseDoc.update({
        where: { id: against.id },
        data: { amountPaid: paid, status: paid.gte(against.grandTotal) ? "PAID" : "PARTIALLY_PAID" },
      });
    }

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "SupplierPayment", entityId: payment.id, meta: { number, amount: input.amount } });
    return { id: payment.id, number };
  });
}

/* ─────────────────────────────  Debit Note  ──────────────────────────── */

export async function createDebitNote(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: DebitNoteCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const invoice = await tx.purchaseDoc.findFirst({
      where: { id: input.reversesDocId, companyId, type: "INVOICE" },
      select: { id: true, number: true, supplierLedgerId: true, supplierName: true, grandTotal: true },
    });
    if (!invoice) throw errors.validation(null, "Invoice not found");

    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcPurchaseTotals(calcLines, 0);
    if (D(totals.grandTotal).lte(0))
      throw errors.validation(null, "Debit note total must be greater than zero");

    const alreadyDebited = await tx.purchaseDoc.aggregate({
      where: { companyId, type: "DEBIT_NOTE", reversesDocId: invoice.id },
      _sum: { grandTotal: true },
    });
    const room = D(invoice.grandTotal).sub(alreadyDebited._sum.grandTotal ?? 0);
    if (D(totals.grandTotal).gt(room.add(0.01)))
      throw errors.validation(null, `Debit ${totals.grandTotal} exceeds the ${room.toFixed(2)} remaining on ${invoice.number}`);

    const seq = await nextNumber(tx, companyId, fiscalYearId, "purchase:DEBIT_NOTE");
    const number = formatVoucherNumber("DEBIT_NOTE", fy!.name, seq);

    const defaultWh = await tx.warehouse.findFirst({ where: { companyId, deletedAt: null }, orderBy: { isDefault: "desc" }, select: { id: true } });

    const dn = await tx.purchaseDoc.create({
      data: {
        companyId, fiscalYearId, type: "DEBIT_NOTE", number,
        date: new Date(input.date),
        supplierLedgerId: invoice.supplierLedgerId, supplierName: invoice.supplierName,
        reversesDocId: invoice.id,
        notes: orNull(input.notes),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
        totalExciseDuty: D(totals.totalExciseDuty),
        totalCustomDuty: D(totals.totalCustomDuty),
        nonTaxableTotal: D(totals.nonTaxableTotal),
        taxableTotal: D(totals.taxableTotal),
        vatAmount: D(totals.vatAmount),
        grandTotal: D(totals.grandTotal),
        status: "PAID",
        createdById: actorId,
        items: {
          create: input.lines.map((l, i) => ({
            productId: orNull(l.productId),
            description: l.description,
            hsCode: orNull(l.hsCode),
            warehouseId: orNull(l.warehouseId) ?? defaultWh?.id ?? null,
            qty: D(l.qty), rate: D(l.rate), discount: D(l.discount ?? 0),
            exciseDuty: D(l.exciseDuty ?? 0), customDuty: D(l.customDuty ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            landedAmount: D(totals.lines[i].capitalizedAmount),
            landedUnitCost: D(totals.lines[i].landedUnitCost),
            lineVat: D(totals.lines[i].lineVat),
            order: i,
          })),
        },
      },
      include: { items: true },
    });

    // Stock OUT (goods return to supplier) — valued at THIS debit note's own landed unit
    // cost (rate + duty, exactly as calcPurchaseTotals computed it for the return lines),
    // NOT the product's current weighted-average cost. The weighted average has likely
    // drifted since the original purchase (other unrelated purchases in between); using it
    // here would (a) credit Inventory for a different amount than what was actually
    // recorded for this lot, throwing the voucher out of balance, and (b) distort the
    // remaining weighted average as if this return were a different-cost transaction.
    // A debit note reverses exactly what its own lines say — same principle as the
    // original Purchase Invoice, just with debit/credit swapped.
    const goodsLines = dn.items.filter((it, i) => calcLines[i].productKind === "GOODS" && it.productId && it.warehouseId);
    if (goodsLines.length) {
      await postStockMovement(tx, {
        companyId, fiscalYearId, date: new Date(input.date), kind: "PURCHASE_RETURN",
        sourceType: "PurchaseDoc", sourceId: dn.id, createdById: actorId,
        lines: goodsLines.map((it) => ({
          productId: it.productId!, warehouseId: it.warehouseId!, qty: it.qty.toString(),
          unitCost: it.landedUnitCost.toString(),
        })),
      });
    }

    const inventoryBackByLedger = new Map<string, Prisma.Decimal>();
    goodsLines.forEach((it) => {
      const idx = dn.items.indexOf(it);
      const code = inventoryLedgerCodeFor(calcLines[idx].inventoryRole);
      inventoryBackByLedger.set(code, (inventoryBackByLedger.get(code) ?? D(0)).add(it.landedAmount));
    });
    const expenseLines = dn.items.filter((it, i) => calcLines[i].productKind !== "GOODS");
    const expenseBack = expenseLines.reduce((a, it) => a.add(it.landedAmount), D(0));

    const creditLines: { ledgerId: string; credit: string }[] = [];
    for (const [code, amount] of inventoryBackByLedger) {
      if (amount.gt(0)) creditLines.push({ ledgerId: await ledgerId(tx, companyId, code), credit: amount.toFixed(2) });
    }
    if (expenseBack.gt(0)) creditLines.push({ ledgerId: await ledgerId(tx, companyId, LEDGER.PURCHASE_EXPENSE), credit: expenseBack.toFixed(2) });

    const v = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "DEBIT_NOTE",
      narration: `Debit note ${number} against ${invoice.number}`,
      sourceType: "PurchaseDoc", sourceId: dn.id, createdById: actorId,
      lines: [
        { ledgerId: invoice.supplierLedgerId!, debit: totals.grandTotal, narration: invoice.supplierName ?? "" },
        ...creditLines,
        ...(D(totals.vatAmount).gt(0) ? [{ ledgerId: await ledgerId(tx, companyId, LEDGER.VAT_RECEIVABLE), credit: totals.vatAmount }] : []),
      ],
    });

    await tx.purchaseDoc.update({ where: { id: dn.id }, data: { voucherId: v.id } });

    const newlyDebited = D(alreadyDebited._sum.grandTotal ?? 0).add(totals.grandTotal);
    await tx.purchaseDoc.update({
      where: { id: invoice.id },
      data: { status: newlyDebited.gte(D(invoice.grandTotal).sub(0.01)) ? "CANCELLED" : "RETURNED" },
    });

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "DebitNote", entityId: dn.id, meta: { number, against: invoice.number, grandTotal: totals.grandTotal } });
    return { id: dn.id, number };
  });
}

/* ─────────────────────  Conversion / listing / detail  ────────────── */

export async function listPurchaseDocs(
  companyId: string,
  fiscalYearId: string | null,
  type: "PURCHASE_ORDER" | "INVOICE" | "DEBIT_NOTE",
  opts: { page?: number; search?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.PurchaseDocWhereInput = {
    companyId, type,
    ...(fiscalYearId ? { fiscalYearId } : {}),
    ...(opts.search
      ? { OR: [{ number: { contains: opts.search, mode: "insensitive" } }, { supplierName: { contains: opts.search, mode: "insensitive" } }, { supplierInvoiceNumber: { contains: opts.search, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.purchaseDoc.findMany({
      where, orderBy: [{ date: "desc" }, { number: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
      select: {
        id: true, number: true, date: true, supplierName: true, supplierInvoiceNumber: true,
        totalExciseDuty: true, totalCustomDuty: true, taxableTotal: true, vatAmount: true,
        grandTotal: true, amountPaid: true, status: true,
      },
    }),
    db.purchaseDoc.count({ where }),
  ]);
  return {
    rows: rows.map((d) => ({
      id: d.id, number: d.number, date: d.date.toISOString().slice(0, 10),
      supplier: d.supplierName ?? "—", supplierInvoiceNumber: d.supplierInvoiceNumber ?? "—",
      excise: d.totalExciseDuty.toFixed(2), custom: d.totalCustomDuty.toFixed(2),
      taxable: d.taxableTotal.toFixed(2), vat: d.vatAmount.toFixed(2),
      grandTotal: d.grandTotal.toFixed(2), outstanding: D(d.grandTotal).sub(d.amountPaid).toFixed(2),
      status: d.status,
    })),
    total, page, pageSize,
  };
}

export async function getPurchaseDoc(companyId: string, id: string) {
  const d = await db.purchaseDoc.findFirst({
    where: { id, companyId },
    include: {
      items: { orderBy: { order: "asc" } },
      payments: { select: { number: true, date: true, amount: true } },
      fiscalYear: { select: { name: true } },
      customStatus: { select: { id: true, label: true, color: true } },
    },
  });
  if (!d) throw errors.notFound("Document not found");
  const customFieldValues = await getCustomFieldValuesForEntity(companyId, "PURCHASE_INVOICE", d.id);
  return { ...d, customFieldValues };
}

/** Set/clear the doc's descriptive Custom Status tag (Settings › Custom Status). Purely
 * additive metadata — editable freely after creation, unlike every other invoice field. */
export async function setPurchaseDocCustomStatus(
  companyId: string,
  actorId: string,
  id: string,
  customStatusId: string | null,
) {
  const doc = await db.purchaseDoc.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!doc) throw errors.notFound("Document not found");

  if (customStatusId) {
    const tag = await db.customStatus.findFirst({
      where: { id: customStatusId, companyId, module: "PURCHASE_INVOICE", isActive: true },
    });
    if (!tag) throw errors.validation(null, "Invalid status tag");
  }

  await db.purchaseDoc.update({ where: { id }, data: { customStatusId } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "PurchaseDoc", entityId: id, meta: { customStatusId } });
}

export async function convertPurchaseOrder(companyId: string, id: string) {
  const doc = await db.purchaseDoc.findFirst({ where: { id, companyId }, include: { items: { orderBy: { order: "asc" } } } });
  if (!doc) throw errors.notFound("Document not found");
  if (doc.status === "CONVERTED") throw errors.conflict("Already converted");
  if (doc.type !== "PURCHASE_ORDER") throw errors.badRequest("Only purchase orders convert to an invoice");

  return {
    prefill: {
      supplierLedgerId: doc.supplierLedgerId ?? "",
      referenceNo: doc.number,
      convertedFromId: doc.id,
      invoiceDiscount: Number(doc.invoiceDiscount),
      lines: doc.items.map((it) => ({
        productId: it.productId ?? "", description: it.description, hsCode: it.hsCode ?? "",
        qty: Number(it.qty), rate: Number(it.rate), discount: Number(it.discount),
        exciseDuty: Number(it.exciseDuty), customDuty: Number(it.customDuty),
        taxRateId: it.taxRateId ?? "", isNonTaxable: it.isNonTaxable,
      })),
    },
  };
}
