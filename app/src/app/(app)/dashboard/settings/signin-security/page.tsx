import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listUserSessions } from "@/server/settings/service";
import { SigninSecurityView } from "./signin-security-view";

export const metadata = { title: "Signin & Security — Bela ABMS" };

export default async function SigninSecurityPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.signin_and_security", "read")) redirect("/dashboard");

  const sessions = await listUserSessions(s.id);
  return <SigninSecurityView sessions={sessions} />;
}
