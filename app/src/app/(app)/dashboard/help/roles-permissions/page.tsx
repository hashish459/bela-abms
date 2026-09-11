import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, ExampleBox, TipBox } from "@/components/manual";

export const metadata = { title: "Roles & Permissions — User Manual" };

export default async function RolesManualPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Roles & Permissions" />
      <ManualIntro>
        What you can see in the sidebar, and what you&apos;re allowed to do on each page, is
        controlled entirely by your <strong>Role</strong> — not by what buttons happen to be
        drawn on screen. This section explains the model so it&apos;s never a mystery why a
        menu item is missing.
      </ManualIntro>

      <ManualSection title="How a permission check works">
        <FlowSteps
          steps={[
            { title: "User", desc: "Has one or more Roles" },
            { title: "Role", desc: "Has permissions on specific modules" },
            { title: "Module", desc: "e.g. \"Sales Invoice\", \"Database Console\"" },
            { title: "Action", desc: "Create / Read / Update / Delete" },
          ]}
        />
        <p>
          Every page and every API request re-checks this on the server — hiding a menu item
          is a convenience, not the actual security boundary. Even if you guessed a URL
          directly, the server would still refuse the request if your role lacks the
          permission.
        </p>
      </ManualSection>

      <ManualSection title="The two demo roles">
        <KeyConcepts
          items={[
            { term: "Administrator", def: "Full Create/Read/Update/Delete on every module in the system, including System Info and the Database Console. Intended for the business owner or IT administrator." },
            { term: "Cashier", def: "Can view the dashboard, create Sales Invoices/Quotations/Receipts, and look up contacts and products — nothing else. A realistic front-counter role." },
          ]}
        />
        <ExampleBox title="Why a Cashier doesn't see Purchase in the sidebar">
          <p>
            The sidebar is built from the same permission set the server checks. Since the
            Cashier role has no permission rows at all for any Purchase module, the menu
            simply has nothing to show there — it&apos;s not a special case, it&apos;s the
            same rule applying consistently everywhere.
          </p>
        </ExampleBox>
      </ManualSection>

      <ManualSection title="If something is missing">
        <TipBox>
          Ask your Administrator to grant your role Read (or Create/Update/Delete, as
          appropriate) access to the module you need, under Settings › User &amp; Permissions.
          Never work around a missing permission by using someone else&apos;s login — every
          action is tied to the user who performed it in the audit log, by design.
        </TipBox>
      </ManualSection>
    </>
  );
}
