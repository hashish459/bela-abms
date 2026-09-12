import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listPayables } from "@/server/purchase/service";
import { PayableWorkspace } from "./payable-workspace";

export const metadata = { title: "Payable Amount — Bela ABMS" };

export default async function PayablePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.payable_amount", "read")) redirect("/dashboard");

  const initial = await listPayables(s.companyId!);

  return <PayableWorkspace initial={initial} />;
}
