import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DatabaseConsoleView } from "./database-console-view";

export const metadata = { title: "Database Console — Bela ABMS" };

export default async function DatabaseConsolePage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "system.database_console", "read")) redirect("/dashboard");
  return <DatabaseConsoleView />;
}
