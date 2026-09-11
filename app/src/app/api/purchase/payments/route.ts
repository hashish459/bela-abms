import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { supplierPaymentCreate } from "@/server/purchase/schemas";
import { createSupplierPayment } from "@/server/purchase/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.payment", "read");
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const [rows, total] = await Promise.all([
    db.supplierPayment.findMany({
      where: { companyId, ...(fyId ? { fiscalYearId: fyId } : {}) },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * 15, take: 15,
      select: { id: true, number: true, date: true, amount: true, paymentMode: true, reference: true, againstDoc: { select: { number: true } } },
    }),
    db.supplierPayment.count({ where: { companyId, ...(fyId ? { fiscalYearId: fyId } : {}) } }),
  ]);
  return ok({
    rows: rows.map((r) => ({
      id: r.id, number: r.number, date: r.date.toISOString().slice(0, 10),
      amount: r.amount.toFixed(2), paymentMode: r.paymentMode,
      against: r.againstDoc?.number ?? "On account", reference: r.reference ?? "—",
    })),
    total, page,
  });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.payment", "create");
  const input = supplierPaymentCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ payment: await createSupplierPayment(companyId, fyId, session.id, input) }, { status: 201 });
});
