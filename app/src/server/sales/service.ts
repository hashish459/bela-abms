import "server-only";
import { Prisma, type SalesDocType } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { postVoucher, nextNumber, formatVoucherNumber } from "@/server/accounts/gl";
import { postStockMovement } from "@/server/inventory/stock";
import { weightedAverageCost } from "@/server/inventory/cost";
import { getCustomFieldValuesForEntity, prepareCustomFieldValues, saveCustomFieldValues } from "@/server/custom-fields/service";
import { calcSalesTotals, type CalcLineInput } from "./calc";
import type {
  CreditNoteCreate,
  DraftCreate,
  InvoiceCreate,
  ReceiptCreate,
} from "./schemas";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const orNull = (v?: string) => (v && v.length ? v : null);

/* System ledger codes we post to (seeded NFRS COA). */
const LEDGER = {
  SALES: "RFO-02-0003", // Sales
  SALES_RETURN: "RFO-02-0002", // Sales Return
  VAT_PAYABLE: "ONFC-C-07-0001", // Vat Payable
  COGS: "COS-01-0100", // Cost of Goods Sold (seeded)
  INVENTORY: "INV-01-0001", // Finished Inventory
};

async function ledgerId(tx: Tx, companyId: string, code: string): Promise<string> {
  const l = await tx.ledger.findFirst({
    where: { companyId, code, deletedAt: null },
    select: { id: true },
  });
  if (!l) throw errors.validation(null, `System account ${code} is missing — re-run the seed`);
  return l.id;
}

/** Build calc inputs from raw line data + tax-rate lookup. */
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
  }[],
) {
  const taxIds = [...new Set(lines.map((l) => orNull(l.taxRateId)).filter(Boolean) as string[])];
  const rates = taxIds.length
    ? await tx.taxRate.findMany({
        where: { id: { in: taxIds }, companyId },
        select: { id: true, ratePct: true, isNoTax: true },
      })
    : [];
  const rateById = new Map(rates.map((r) => [r.id, r]));

  const productIds = [...new Set(lines.map((l) => orNull(l.productId)).filter(Boolean) as string[])];
  const products = productIds.length
    ? await tx.product.findMany({
        where: { id: { in: productIds }, companyId, deletedAt: null },
        select: { id: true, kind: true, taxBasis: true, isNonTaxable: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  return lines.map((l): CalcLineInput & { productKind?: string; taxRatePct: number } => {
    const rate = orNull(l.taxRateId) ? rateById.get(l.taxRateId!) : undefined;
    const product = orNull(l.productId) ? productById.get(l.productId!) : undefined;
    const nonTaxable = l.isNonTaxable || !!rate?.isNoTax || !!product?.isNonTaxable || !rate;
    return {
      qty: l.qty,
      rate: l.rate,
      discount: l.discount ?? 0,
      taxRatePct: rate ? Number(rate.ratePct) : 0,
      isNonTaxable: nonTaxable,
      priceInclusive: product?.taxBasis === "INCLUSIVE",
      productKind: product?.kind,
    };
  });
}

/** Sales depletes an EXISTING batch (never creates one) — the line editor's
 * picker only ever offers batches with stock on hand, but this re-validates
 * server-side that each chosen batch actually belongs to its line's product
 * + warehouse + company before it's trusted for a stock-out. */
async function resolveLineBatchIds(
  tx: Tx,
  companyId: string,
  lines: { productId?: string; warehouseId?: string; batchId?: string }[],
  defaultWarehouseId?: string,
): Promise<(string | null)[]> {
  const ids = [...new Set(lines.map((l) => orNull(l.batchId)).filter(Boolean) as string[])];
  if (!ids.length) return lines.map(() => null);

  const batches = await tx.productBatch.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, productId: true, warehouseId: true },
  });
  const byId = new Map(batches.map((b) => [b.id, b]));

  return lines.map((l) => {
    const batchId = orNull(l.batchId);
    if (!batchId) return null;
    const batch = byId.get(batchId);
    const warehouseId = orNull(l.warehouseId) ?? defaultWarehouseId;
    if (!batch || batch.productId !== orNull(l.productId) || batch.warehouseId !== warehouseId)
      throw errors.validation(null, "Selected batch does not match this line's product/warehouse");
    return batchId;
  });
}

/* ───────────────────────  Quotation / Sales Order (drafts)  ────────── */

export async function createDraft(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: DraftCreate,
) {
  return db.$transaction(async (tx) => {
    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcSalesTotals(calcLines, input.invoiceDiscount ?? 0);
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, `sales:${input.type}`);
    const DRAFT_PREFIX: Record<typeof input.type, string> = {
      QUOTATION: "QU-", SALES_ORDER: "SO-", PROFORMA_INVOICE: "PF-",
    };
    const number = formatVoucherNumber("SALES", fy!.name, seq).replace(/^SA-/, DRAFT_PREFIX[input.type]);

    const customer = orNull(input.customerLedgerId)
      ? await tx.ledger.findFirst({ where: { id: input.customerLedgerId, companyId }, select: { id: true, name: true, panNumber: true } })
      : null;

    const doc = await tx.salesDoc.create({
      data: {
        companyId,
        fiscalYearId,
        type: input.type,
        number,
        date: new Date(input.date),
        customerLedgerId: customer?.id ?? null,
        customerName: customer?.name ?? orNull(input.customerName),
        customerPan: customer?.panNumber ?? orNull(input.customerPan),
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        creditDays: input.creditDays ?? null,
        referenceNo: orNull(input.referenceNo),
        notes: orNull(input.notes),
        invoiceDiscount: D(totals.invoiceDiscount),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
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
            qty: D(l.qty),
            rate: D(l.rate),
            discount: D(l.discount ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            priceInclusive: !!calcLines[i].priceInclusive,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            lineVat: D(totals.lines[i].lineVat),
            order: i,
          })),
        },
      },
    });
    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "SalesDoc", entityId: doc.id, meta: { type: input.type, number } });
    return doc;
  });
}

/* ─────────────────────────────  Invoice  ──────────────────────────── */

export async function createInvoice(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: InvoiceCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      select: { name: true, isClosed: true },
    });
    if (!fy) throw errors.badRequest("Invalid fiscal year");
    if (fy.isClosed) throw errors.badRequest("Fiscal year is closed");

    const customFieldValues = await prepareCustomFieldValues(companyId, "SALES_INVOICE", input.customFields, tx);

    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcSalesTotals(calcLines, input.invoiceDiscount ?? 0);
    if (D(totals.grandTotal).lte(0))
      throw errors.validation(null, "Invoice total must be greater than zero");

    const customer = orNull(input.customerLedgerId)
      ? await tx.ledger.findFirst({
          where: { id: input.customerLedgerId, companyId, deletedAt: null },
          select: { id: true, name: true, panNumber: true, creditLimit: true, contactKind: true },
        })
      : null;
    if (orNull(input.customerLedgerId) && !customer)
      throw errors.validation(null, "Customer not found");

    // gap-free invoice number
    const seq = await nextNumber(tx, companyId, fiscalYearId, "sales:INVOICE");
    const number = formatVoucherNumber("SALES", fy.name, seq); // SA-2083/84-0001

    // default warehouse for goods lines
    const defaultWh = await tx.warehouse.findFirst({
      where: { companyId, deletedAt: null },
      orderBy: { isDefault: "desc" },
      select: { id: true },
    });

    const batchIds = await resolveLineBatchIds(tx, companyId, input.lines, defaultWh?.id);

    const notCredit = input.paymentMode !== "CREDIT";
    const paymentLedgerId = notCredit ? orNull(input.paymentLedgerId)! : null;

    const doc = await tx.salesDoc.create({
      data: {
        companyId,
        fiscalYearId,
        type: "INVOICE",
        number,
        date: new Date(input.date),
        customerLedgerId: customer?.id ?? null,
        customerName: customer?.name ?? orNull(input.customerName),
        customerPan: customer?.panNumber ?? orNull(input.customerPan),
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        creditDays: input.creditDays ?? null,
        referenceNo: orNull(input.referenceNo),
        paymentMode: input.paymentMode,
        paymentLedgerId,
        notes: orNull(input.notes),
        convertedFromId: orNull(input.convertedFromId),
        invoiceDiscount: D(totals.invoiceDiscount),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
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
            qty: D(l.qty),
            rate: D(l.rate),
            discount: D(l.discount ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            priceInclusive: !!calcLines[i].priceInclusive,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            lineVat: D(totals.lines[i].lineVat),
            batchId: batchIds[i],
            order: i,
          })),
        },
      },
      include: { items: true },
    });

    // 1. stock OUT for goods lines
    const goodsLines = doc.items.filter(
      (it, i) => calcLines[i].productKind === "GOODS" && it.productId && it.warehouseId,
    );
    if (goodsLines.length) {
      await postStockMovement(tx, {
        companyId,
        fiscalYearId,
        date: new Date(input.date),
        kind: "SALE",
        sourceType: "SalesDoc",
        sourceId: doc.id,
        createdById: actorId,
        lines: goodsLines.map((it) => ({
          productId: it.productId!,
          warehouseId: it.warehouseId!,
          batchId: it.batchId,
          qty: it.qty.toString(),
        })),
      });
    }

    // 2. main sales voucher
    const revenue = D(totals.taxableTotal).add(totals.nonTaxableTotal);
    const debitLedger = notCredit ? paymentLedgerId! : customer!.id;
    const salesVoucher = await postVoucher(tx, {
      companyId,
      fiscalYearId,
      date: new Date(input.date),
      type: "SALES",
      narration: `Sales invoice ${number}`,
      sourceType: "SalesDoc",
      sourceId: doc.id,
      createdById: actorId,
      lines: [
        { ledgerId: debitLedger, debit: totals.grandTotal, narration: customer?.name ?? doc.customerName ?? "Cash sale" },
        { ledgerId: await ledgerId(tx, companyId, LEDGER.SALES), credit: revenue.toFixed(2) },
        ...(D(totals.vatAmount).gt(0)
          ? [{ ledgerId: await ledgerId(tx, companyId, LEDGER.VAT_PAYABLE), credit: totals.vatAmount }]
          : []),
      ],
    });

    // 3. COGS (perpetual): value goods lines at weighted-average cost — one
    // batched lookup per unique product (run concurrently), not one query
    // per line item, so a 20-line invoice doesn't cost 20 sequential round trips.
    const cogsProductIds = [...new Set(goodsLines.map((it) => it.productId!))];
    const cogsCostByProduct = new Map(
      await Promise.all(
        cogsProductIds.map(async (pid) => [pid, await weightedAverageCost(companyId, pid, tx)] as const),
      ),
    );
    let totalCogs = D(0);
    for (const it of goodsLines) {
      const cost = cogsCostByProduct.get(it.productId!)!;
      totalCogs = totalCogs.add(cost.mul(it.qty));
    }
    let cogsVoucherId: string | null = null;
    if (totalCogs.gt(0)) {
      const cv = await postVoucher(tx, {
        companyId,
        fiscalYearId,
        date: new Date(input.date),
        type: "SALES",
        narration: `COGS for ${number}`,
        sourceType: "SalesDoc:cogs",
        sourceId: doc.id,
        createdById: actorId,
        lines: [
          { ledgerId: await ledgerId(tx, companyId, LEDGER.COGS), debit: totalCogs.toFixed(2) },
          { ledgerId: await ledgerId(tx, companyId, LEDGER.INVENTORY), credit: totalCogs.toFixed(2) },
        ],
      });
      cogsVoucherId = cv.id;
    }

    // 4. cash / bank sale → also record a Receipt so AR reports stay consistent
    let receiptNumber: string | null = null;
    if (notCredit && customer) {
      // Dr the customer in the main voucher already; now settle it with a receipt
      const rSeq = await nextNumber(tx, companyId, fiscalYearId, "sales:RECEIPT");
      receiptNumber = formatVoucherNumber("RECEIPT", fy.name, rSeq);
      const rVoucher = await postVoucher(tx, {
        companyId, fiscalYearId, date: new Date(input.date), type: "RECEIPT",
        narration: `Receipt ${receiptNumber} against ${number}`,
        sourceType: "Receipt", sourceId: doc.id, createdById: actorId,
        lines: [
          { ledgerId: paymentLedgerId!, debit: totals.grandTotal },
          { ledgerId: customer.id, credit: totals.grandTotal },
        ],
      });
      await tx.receipt.create({
        data: {
          companyId, fiscalYearId, number: receiptNumber, date: new Date(input.date),
          customerLedgerId: customer.id, paymentLedgerId: paymentLedgerId!,
          againstDocId: doc.id, amount: D(totals.grandTotal),
          paymentMode: input.paymentMode, voucherId: rVoucher.id, createdById: actorId,
        },
      });
    }
    // NOTE: for a pure cash sale (no customer ledger) the main voucher debits
    // Cash directly, so no receivable / receipt is needed.

    const finalDoc = await tx.salesDoc.update({
      where: { id: doc.id },
      data: { voucherId: salesVoucher.id, cogsVoucherId },
    });

    if (orNull(input.convertedFromId)) {
      await tx.salesDoc.update({
        where: { id: input.convertedFromId },
        data: { status: "CONVERTED" },
      });
    }

    if (customFieldValues.length) await saveCustomFieldValues(tx, companyId, doc.id, customFieldValues);

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "SalesInvoice", entityId: doc.id,
      meta: { number, grandTotal: totals.grandTotal, cogs: totalCogs.toFixed(2) },
    });

    return { id: finalDoc.id, number, grandTotal: totals.grandTotal, receiptNumber };
  });
}

/* ─────────────────────────────  Receipt  ──────────────────────────── */

export async function createReceipt(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: ReceiptCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const seq = await nextNumber(tx, companyId, fiscalYearId, "sales:RECEIPT");
    const number = formatVoucherNumber("RECEIPT", fy!.name, seq);

    const customer = await tx.ledger.findFirst({
      where: { id: input.customerLedgerId, companyId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!customer) throw errors.validation(null, "Customer not found");

    let against = null;
    if (orNull(input.againstDocId)) {
      against = await tx.salesDoc.findFirst({
        where: { id: input.againstDocId, companyId, type: "INVOICE" },
        select: { id: true, grandTotal: true, amountPaid: true, number: true },
      });
      if (!against) throw errors.validation(null, "Invoice not found");
      const outstanding = D(against.grandTotal).sub(against.amountPaid);
      if (D(input.amount).gt(outstanding.add(0.01)))
        throw errors.validation(
          null,
          `Receipt ${input.amount} exceeds the ${outstanding.toFixed(2)} outstanding on ${against.number}`,
        );
    }

    const voucher = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "RECEIPT",
      narration: `Receipt ${number}${against ? ` against ${against.number}` : ""}`,
      sourceType: "Receipt", sourceId: number, createdById: actorId,
      lines: [
        { ledgerId: input.paymentLedgerId, debit: input.amount.toString() },
        { ledgerId: customer.id, credit: input.amount.toString(), narration: customer.name },
      ],
    });

    const receipt = await tx.receipt.create({
      data: {
        companyId, fiscalYearId, number, date: new Date(input.date),
        customerLedgerId: customer.id, paymentLedgerId: input.paymentLedgerId,
        againstDocId: against?.id ?? null, amount: D(input.amount),
        paymentMode: input.paymentMode, reference: orNull(input.reference),
        notes: orNull(input.notes), voucherId: voucher.id, createdById: actorId,
      },
    });

    if (against) {
      const paid = D(against.amountPaid).add(input.amount);
      await tx.salesDoc.update({
        where: { id: against.id },
        data: {
          amountPaid: paid,
          status: paid.gte(against.grandTotal) ? "PAID" : "PARTIALLY_PAID",
        },
      });
    }

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Receipt", entityId: receipt.id, meta: { number, amount: input.amount } });
    return { id: receipt.id, number };
  });
}

export async function getReceipt(companyId: string, id: string) {
  const r = await db.receipt.findFirst({
    where: { id, companyId },
    include: {
      fiscalYear: { select: { name: true } },
      againstDoc: { select: { number: true } },
    },
  });
  if (!r) throw errors.notFound("Receipt not found");

  const [customer, paymentLedger] = await Promise.all([
    db.ledger.findFirst({ where: { id: r.customerLedgerId }, select: { name: true, panNumber: true } }),
    db.ledger.findFirst({ where: { id: r.paymentLedgerId }, select: { name: true } }),
  ]);

  return { ...r, customer, paymentLedger };
}

/* ───────────────────────────  Credit Note  ───────────────────────── */

export async function createCreditNote(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: CreditNoteCreate,
) {
  return db.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { name: true } });
    const invoice = await tx.salesDoc.findFirst({
      where: { id: input.reversesDocId, companyId, type: "INVOICE" },
      select: {
        id: true, number: true, customerLedgerId: true, customerName: true,
        grandTotal: true, paymentMode: true, paymentLedgerId: true,
      },
    });
    if (!invoice) throw errors.validation(null, "Invoice not found");

    const calcLines = await buildCalcLines(tx, companyId, input.lines);
    const totals = calcSalesTotals(calcLines, 0);
    if (D(totals.grandTotal).lte(0))
      throw errors.validation(null, "Credit note total must be greater than zero");

    // can't credit more than was invoiced
    const alreadyCredited = await tx.salesDoc.aggregate({
      where: { companyId, type: "CREDIT_NOTE", reversesDocId: invoice.id },
      _sum: { grandTotal: true },
    });
    const room = D(invoice.grandTotal).sub(alreadyCredited._sum.grandTotal ?? 0);
    if (D(totals.grandTotal).gt(room.add(0.01)))
      throw errors.validation(
        null,
        `Credit ${totals.grandTotal} exceeds the ${room.toFixed(2)} remaining on ${invoice.number}`,
      );

    const seq = await nextNumber(tx, companyId, fiscalYearId, "sales:CREDIT_NOTE");
    const number = formatVoucherNumber("CREDIT_NOTE", fy!.name, seq);

    const defaultWh = await tx.warehouse.findFirst({
      where: { companyId, deletedAt: null },
      orderBy: { isDefault: "desc" },
      select: { id: true },
    });

    const cn = await tx.salesDoc.create({
      data: {
        companyId, fiscalYearId, type: "CREDIT_NOTE", number,
        date: new Date(input.date),
        customerLedgerId: invoice.customerLedgerId,
        customerName: invoice.customerName,
        reversesDocId: invoice.id,
        notes: orNull(input.notes),
        subtotal: D(totals.subtotal),
        lineDiscountTotal: D(totals.lineDiscountTotal),
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
            qty: D(l.qty),
            rate: D(l.rate),
            discount: D(l.discount ?? 0),
            taxRateId: orNull(l.taxRateId),
            taxRatePct: D(calcLines[i].taxRatePct),
            isNonTaxable: !!calcLines[i].isNonTaxable,
            grossAmount: D(totals.lines[i].grossAmount),
            netAmount: D(totals.lines[i].netAmount),
            lineVat: D(totals.lines[i].lineVat),
            order: i,
          })),
        },
      },
      include: { items: true },
    });

    // stock back IN — value the return at the CURRENT weighted-average cost so the
    // returned units don't dilute the average with a zero cost.
    const goodsLines = cn.items.filter(
      (it, i) => calcLines[i].productKind === "GOODS" && it.productId && it.warehouseId,
    );
    const returnProductIds = [...new Set(goodsLines.map((it) => it.productId!))];
    const costByProduct = new Map(
      await Promise.all(
        returnProductIds.map(async (pid) => [pid, await weightedAverageCost(companyId, pid, tx)] as const),
      ),
    );
    if (goodsLines.length) {
      await postStockMovement(tx, {
        companyId, fiscalYearId, date: new Date(input.date), kind: "SALES_RETURN",
        sourceType: "SalesDoc", sourceId: cn.id, createdById: actorId, allowNegative: true,
        lines: goodsLines.map((it) => ({
          productId: it.productId!, warehouseId: it.warehouseId!, qty: it.qty.toString(),
          unitCost: costByProduct.get(it.productId!)!.toString(),
        })),
      });
    }

    // reversal GL: Dr Sales Return + Dr VAT Payable / Cr Customer (or Cash for a cash-sale credit)
    const creditLedger = invoice.customerLedgerId ?? invoice.paymentLedgerId!;
    const revenue = D(totals.taxableTotal).add(totals.nonTaxableTotal);
    const v = await postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "CREDIT_NOTE",
      narration: `Credit note ${number} against ${invoice.number}`,
      sourceType: "SalesDoc", sourceId: cn.id, createdById: actorId,
      lines: [
        { ledgerId: await ledgerId(tx, companyId, LEDGER.SALES_RETURN), debit: revenue.toFixed(2) },
        ...(D(totals.vatAmount).gt(0)
          ? [{ ledgerId: await ledgerId(tx, companyId, LEDGER.VAT_PAYABLE), debit: totals.vatAmount }]
          : []),
        { ledgerId: creditLedger, credit: totals.grandTotal, narration: invoice.customerName ?? "" },
      ],
    });

    // COGS reversal — same cost basis used for the return movement above
    let cogsBack = D(0);
    for (const it of goodsLines) {
      cogsBack = cogsBack.add(costByProduct.get(it.productId!)!.mul(it.qty));
    }
    let cogsVoucherId: string | null = null;
    if (cogsBack.gt(0)) {
      const cv = await postVoucher(tx, {
        companyId, fiscalYearId, date: new Date(input.date), type: "CREDIT_NOTE",
        narration: `COGS reversal for ${number}`,
        sourceType: "SalesDoc:cogs", sourceId: cn.id, createdById: actorId,
        lines: [
          { ledgerId: await ledgerId(tx, companyId, LEDGER.INVENTORY), debit: cogsBack.toFixed(2) },
          { ledgerId: await ledgerId(tx, companyId, LEDGER.COGS), credit: cogsBack.toFixed(2) },
        ],
      });
      cogsVoucherId = cv.id;
    }

    await tx.salesDoc.update({ where: { id: cn.id }, data: { voucherId: v.id, cogsVoucherId } });

    const newlyCredited = D(alreadyCredited._sum.grandTotal ?? 0).add(totals.grandTotal);
    await tx.salesDoc.update({
      where: { id: invoice.id },
      data: {
        status: newlyCredited.gte(D(invoice.grandTotal).sub(0.01)) ? "CANCELLED" : "RETURNED",
      },
    });

    await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "CreditNote", entityId: cn.id, meta: { number, against: invoice.number, grandTotal: totals.grandTotal } });
    return { id: cn.id, number };
  });
}

/* ─────────────────────  Conversion / listing / detail  ────────────── */

export async function listSalesDocs(
  companyId: string,
  fiscalYearId: string | null,
  type: SalesDocType,
  opts: { page?: number; search?: string; status?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 15;
  const where: Prisma.SalesDocWhereInput = {
    companyId,
    type,
    ...(fiscalYearId ? { fiscalYearId } : {}),
    ...(opts.search
      ? {
          OR: [
            { number: { contains: opts.search, mode: "insensitive" } },
            { customerName: { contains: opts.search, mode: "insensitive" } },
            { referenceNo: { contains: opts.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.salesDoc.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, customerName: true, referenceNo: true,
        nonTaxableTotal: true, taxableTotal: true, vatAmount: true, grandTotal: true,
        amountPaid: true, status: true,
      },
    }),
    db.salesDoc.count({ where }),
  ]);
  return {
    rows: rows.map((d) => ({
      id: d.id,
      number: d.number,
      date: d.date.toISOString().slice(0, 10),
      customer: d.customerName ?? "—",
      reference: d.referenceNo ?? "—",
      nonTaxable: d.nonTaxableTotal.toFixed(2),
      taxable: d.taxableTotal.toFixed(2),
      vat: d.vatAmount.toFixed(2),
      grandTotal: d.grandTotal.toFixed(2),
      outstanding: D(d.grandTotal).sub(d.amountPaid).toFixed(2),
      status: d.status,
    })),
    total,
    page,
    pageSize,
  };
}

/** Flat, actionable outstanding-invoice list (Sales › Receivable Amount) —
 * one row per invoice, unlike the Reports › Aging Report's per-customer
 * bucketed totals. Both read the same underlying data; this view exists to
 * let a user jump straight to a specific overdue invoice. */
export async function listReceivables(companyId: string, opts: { search?: string } = {}) {
  const where: Prisma.SalesDocWhereInput = {
    companyId, type: "INVOICE",
    status: { in: ["OPEN", "PARTIALLY_PAID", "RETURNED"] },
    ...(opts.search
      ? { OR: [{ number: { contains: opts.search, mode: "insensitive" } }, { customerName: { contains: opts.search, mode: "insensitive" } }] }
      : {}),
  };
  const invoices = await db.salesDoc.findMany({
    where,
    orderBy: { date: "asc" },
    select: { id: true, number: true, date: true, customerName: true, grandTotal: true, amountPaid: true },
  });
  if (!invoices.length) return { rows: [], total: "0.00" };

  const credits = await db.salesDoc.groupBy({
    by: ["reversesDocId"],
    where: { companyId, type: "CREDIT_NOTE", reversesDocId: { in: invoices.map((i) => i.id) } },
    _sum: { grandTotal: true },
  });
  const creditedById = new Map(credits.map((c) => [c.reversesDocId!, D(c._sum.grandTotal ?? 0)]));
  const today = new Date();

  const rows = invoices
    .map((inv) => {
      const outstanding = D(inv.grandTotal).sub(inv.amountPaid).sub(creditedById.get(inv.id) ?? 0);
      return {
        id: inv.id, number: inv.number, date: inv.date.toISOString().slice(0, 10),
        customer: inv.customerName ?? "Cash sale",
        grandTotal: inv.grandTotal.toFixed(2),
        outstanding: outstanding.toFixed(2),
        daysOverdue: Math.max(0, Math.floor((today.getTime() - inv.date.getTime()) / 86_400_000)),
      };
    })
    .filter((r) => Number(r.outstanding) > 0.01)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { rows, total: rows.reduce((a, r) => a + Number(r.outstanding), 0).toFixed(2) };
}

export async function getSalesDoc(companyId: string, id: string) {
  const d = await db.salesDoc.findFirst({
    where: { id, companyId },
    include: {
      items: { orderBy: { order: "asc" } },
      receipts: { select: { number: true, date: true, amount: true } },
      fiscalYear: { select: { name: true } },
      customStatus: { select: { id: true, label: true, color: true } },
    },
  });
  if (!d) throw errors.notFound("Document not found");
  const customFieldValues = await getCustomFieldValuesForEntity(companyId, "SALES_INVOICE", d.id);
  return { ...d, customFieldValues };
}

/** Set/clear the doc's descriptive Custom Status tag (Settings › Custom Status). Purely
 * additive metadata — unlike every other invoice field, editable freely after creation
 * since it carries no GL/workflow weight. */
export async function setSalesDocCustomStatus(
  companyId: string,
  actorId: string,
  id: string,
  customStatusId: string | null,
) {
  const doc = await db.salesDoc.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!doc) throw errors.notFound("Document not found");

  if (customStatusId) {
    const tag = await db.customStatus.findFirst({
      where: { id: customStatusId, companyId, module: "SALES_INVOICE", isActive: true },
    });
    if (!tag) throw errors.validation(null, "Invalid status tag");
  }

  await db.salesDoc.update({ where: { id }, data: { customStatusId } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "SalesDoc", entityId: id, meta: { customStatusId } });
}

export async function convertDoc(
  companyId: string,
  id: string,
  toType: "SALES_ORDER" | "INVOICE",
) {
  const doc = await db.salesDoc.findFirst({
    where: { id, companyId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!doc) throw errors.notFound("Document not found");
  if (doc.status === "CONVERTED") throw errors.conflict("Already converted");
  if (toType === "SALES_ORDER" && doc.type !== "QUOTATION")
    throw errors.badRequest("Only quotations convert to a sales order");
  if (toType === "INVOICE" && !["QUOTATION", "SALES_ORDER", "PROFORMA_INVOICE"].includes(doc.type))
    throw errors.badRequest("Only quotations, sales orders and proforma invoices convert to an invoice");

  return {
    prefill: {
      customerLedgerId: doc.customerLedgerId ?? "",
      customerName: doc.customerName ?? "",
      referenceNo: doc.number,
      convertedFromId: doc.id,
      invoiceDiscount: Number(doc.invoiceDiscount),
      lines: doc.items.map((it) => ({
        productId: it.productId ?? "",
        description: it.description,
        hsCode: it.hsCode ?? "",
        qty: Number(it.qty),
        rate: Number(it.rate),
        discount: Number(it.discount),
        taxRateId: it.taxRateId ?? "",
        isNonTaxable: it.isNonTaxable,
      })),
    },
  };
}
