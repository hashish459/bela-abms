import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listContacts } from "@/server/accounts/service";
import { ContactsView } from "./contacts-view";

export const metadata = { title: "Contacts — Bela ABMS" };

export default async function ContactsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "accounts.contacts", "read")) redirect("/dashboard");

  const [customers, suppliers] = await Promise.all([
    listContacts(s.companyId!, "CUSTOMER"),
    listContacts(s.companyId!, "SUPPLIER"),
  ]);

  return (
    <ContactsView
      customers={customers}
      suppliers={suppliers}
      canCreate={can(s.permissions, "accounts.contacts", "create")}
    />
  );
}
