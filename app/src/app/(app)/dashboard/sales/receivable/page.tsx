import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listReceivables } from "@/server/sales/service";
import { ReceivableWorkspace } from "./receivable-workspace";

export const metadata = { title: "Receivable Amount — Bela ABMS" };

export default async function ReceivablePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.receivable_amount", "read")) redirect("/dashboard");

  const initial = await listReceivables(s.companyId!);

  return <ReceivableWorkspace initial={initial} />;
}
