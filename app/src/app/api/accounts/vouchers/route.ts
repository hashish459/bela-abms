import { ok, errors, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { voucherCreate } from "@/server/accounts/schemas";
import { createVoucher, listVouchers } from "@/server/accounts/service";

const PERM: Record<string, string> = {
  JOURNAL: "vouchers.journal_voucher",
  CONTRA: "vouchers.contra_voucher",
};

function voucherType(raw: string | null): "JOURNAL" | "CONTRA" {
  const t = (raw ?? "JOURNAL").toUpperCase();
  if (t !== "JOURNAL" && t !== "CONTRA")
    throw errors.badRequest("type must be JOURNAL or CONTRA");
  return t;
}

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const type = voucherType(url.searchParams.get("type"));
  const { companyId } = await guard(PERM[type], "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listVouchers(companyId, fyId, type, {
      page: Number(url.searchParams.get("page") ?? 1),
      search: url.searchParams.get("search") ?? undefined,
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const type = voucherType(body?.type ?? null);
  const { session, companyId } = await guard(PERM[type], "create");
  const input = voucherCreate.parse(body);
  const fyId = await activeFiscalYearId(companyId);
  const voucher = await createVoucher(companyId, fyId, session.id, input);
  return ok({ voucher: { id: voucher.id, number: voucher.number } }, { status: 201 });
});
