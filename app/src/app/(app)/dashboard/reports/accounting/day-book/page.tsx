import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DayBookView } from "./day-book-view";

export const metadata = { title: "Day Book — Bela ABMS" };

export default async function DayBookPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.accounting_reports", "read")) redirect("/dashboard");
  return <DayBookView defaultDate={new Date().toISOString().slice(0, 10)} />;
}
