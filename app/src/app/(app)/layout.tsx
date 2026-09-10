import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { buildMenu } from "@/lib/menu";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [menu, company, fiscalYear] = await Promise.all([
    buildMenu(session.permissions),
    session.companyId
      ? db.company.findUnique({
          where: { id: session.companyId },
          select: { name: true, subdomain: true },
        })
      : null,
    session.companyId
      ? db.fiscalYear.findFirst({
          where: { companyId: session.companyId, active: true },
          select: { name: true },
        })
      : null,
  ]);

  return (
    <AppShell
      menu={menu}
      user={{
        name: `${session.firstName} ${session.lastName}`.trim(),
        email: session.email,
        isAdmin: session.isAdmin,
        roleNames: session.roleNames,
      }}
      company={company?.name ?? "—"}
      fiscalYear={fiscalYear?.name ?? "—"}
    >
      {children}
    </AppShell>
  );
}
