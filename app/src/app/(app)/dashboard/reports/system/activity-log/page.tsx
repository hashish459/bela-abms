import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ActivityLogView } from "@/components/activity-log-view";

export const metadata = { title: "Activity Log — Bela ABMS" };

export default async function ActivityLogPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.system_reports", "read")) redirect("/dashboard");
  return <ActivityLogView />;
}
