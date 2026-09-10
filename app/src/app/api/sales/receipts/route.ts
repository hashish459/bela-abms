import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { receiptCreate } from "@/server/sales/schemas";
import { createReceipt } from "@/server/sales/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.receipt", "read");
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const [rows, total] = await Promise.all([
    db.receipt.findMany({
      where: { companyId, ...(fyId ? { fiscalYearId: fyId } : {}) },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * 15,
      take: 15,
      select: {
        id: true, number: true, date: true, amount: true, paymentMode: true, reference: true,
        againstDoc: { select: { number: true } },
      },
    }),
    db.receipt.count({ where: { companyId, ...(fyId ? { fiscalYearId: fyId } : {}) } }),
  ]);
  return ok({
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      amount: r.amount.toFixed(2),
      paymentMode: r.paymentMode,
      against: r.againstDoc?.number ?? "On account",
      reference: r.reference ?? "—",
    })),
    total,
    page,
  });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.receipt", "create");
  const input = receiptCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok({ receipt: await createReceipt(companyId, fyId, session.id, input) }, { status: 201 });
});
