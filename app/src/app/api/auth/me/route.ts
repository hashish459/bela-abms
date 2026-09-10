import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const GET = handler(async () => {
  const s = await requireSession();

  const company = s.companyId
    ? await db.company.findUnique({
        where: { id: s.companyId },
        select: { id: true, name: true, subdomain: true },
      })
    : null;

  const activeFy = s.companyId
    ? await db.fiscalYear.findFirst({
        where: { companyId: s.companyId, active: true },
        select: { id: true, name: true, startDate: true, endDate: true },
      })
    : null;

  return ok({
    user: {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      userType: s.userType,
      isAdmin: s.isAdmin,
      roleNames: s.roleNames,
    },
    company,
    fiscalYear: activeFy,
    permissions: s.permissions,
  });
});
