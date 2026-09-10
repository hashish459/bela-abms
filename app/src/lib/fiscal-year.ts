import "server-only";
import { db } from "./db";
import { errors } from "./api";

/** The company's active fiscal year id, or throw 400. */
export async function activeFiscalYearId(companyId: string): Promise<string> {
  const fy = await db.fiscalYear.findFirst({
    where: { companyId, active: true },
    select: { id: true },
  });
  if (!fy) throw errors.badRequest("No active fiscal year. Set one in Settings › Fiscal Year.");
  return fy.id;
}

export async function activeFiscalYear(companyId: string) {
  const fy = await db.fiscalYear.findFirst({
    where: { companyId, active: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!fy) throw errors.badRequest("No active fiscal year.");
  return fy;
}
