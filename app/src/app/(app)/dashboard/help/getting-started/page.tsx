import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, TipBox } from "@/components/manual";

export const metadata = { title: "Getting Started — User Manual" };

export default async function GettingStartedPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Getting Started" />
      <ManualIntro>
        Bela ABMS is a Nepal-focused VAT billing and accounting system. Everything you do —
        raising a sale, recording a purchase, adjusting stock — ends up as a balanced entry in
        the General Ledger, so your books are always internally consistent and your reports
        are always trustworthy. This guide gets you oriented before you touch a live invoice.
      </ManualIntro>

      <ManualSection title="The big picture">
        <p>
          Every transaction you record flows through the same four layers, in this order.
          You never post to the ledger directly — the system does it for you, automatically,
          the moment you save a document.
        </p>
        <FlowSteps
          steps={[
            { title: "You", desc: "Create a Sales Invoice, Purchase, Voucher…" },
            { title: "Server calculates", desc: "Totals, VAT, discounts — never trust the browser" },
            { title: "Posts to Ledger", desc: "Debit = Credit, always, or it's rejected" },
            { title: "Reports read it", desc: "Trial Balance, P&L, Balance Sheet, Aging…" },
          ]}
        />
        <TipBox>
          If a document&apos;s totals ever look wrong, the fix is never to hand-edit the ledger —
          it&apos;s to reverse the document properly (Credit Note / Debit Note) and re-enter it.
          Sales and Purchase Invoices can&apos;t be edited or deleted once saved, by design —
          this mirrors how real accounting systems prevent silent, untraceable changes to
          money already recorded.
        </TipBox>
      </ManualSection>

      <ManualSection title="Key concepts before you start">
        <KeyConcepts
          items={[
            { term: "Fiscal Year", def: "Nepal's accounting year (e.g. 2083-84 BS). All documents post against the currently active one — set it in Settings › Fiscal Year." },
            { term: "BS / AD dates", def: "You enter dates in AD (Gregorian) everywhere; the equivalent Bikram Sambat date is shown alongside for reference." },
            { term: "Ledger", def: "Any account in the Chart of Accounts — including every customer and supplier, which are ledgers under Trade Receivable / Trade Payable." },
            { term: "Voucher", def: "One balanced GL posting (Σ Debit = Σ Credit). Every invoice, receipt, and payment creates one behind the scenes." },
            { term: "Company", def: "This deployment serves one company. All data — products, ledgers, documents — belongs to it." },
            { term: "Roles & Permissions", def: "What you can see and do is controlled by your Role. Ask an Administrator if a menu item is missing." },
          ]}
        />
      </ManualSection>

      <ManualSection title="First things to check">
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            <strong>Settings › Fiscal Year</strong> — confirm the correct year is marked active.
          </li>
          <li>
            <strong>Settings › Company Info</strong> — legal name, PAN, and VAT registration
            status feed into every printed invoice.
          </li>
          <li>
            <strong>Accounts › Charts of Accounts</strong> — browse the account structure once;
            you don&apos;t need to memorise it, but knowing Assets/Liabilities/Income/Expense
            exist as top-level groups helps everything else make sense.
          </li>
          <li>
            <strong>Inventory › Products</strong> — add what you sell/buy before your first
            invoice; each product needs a unit, a price, and (for physical goods) an opening
            quantity in a warehouse.
          </li>
        </ol>
      </ManualSection>

      <ManualSection title="Where to go next">
        <p>Pick the tab above that matches what you&apos;re about to do:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Accounts &amp; GL</strong> — the Chart of Accounts and double-entry basics.</li>
          <li><strong>Sales</strong> — Quotation → Sales Order → Invoice → Receipt → Credit Note.</li>
          <li><strong>Purchase</strong> — Purchase Order → Purchase Invoice → Payment → Debit Note.</li>
          <li><strong>Inventory</strong> — products, stock movements, and costing.</li>
          <li><strong>Reports</strong> — what each report means and how to read it.</li>
        </ul>
      </ManualSection>
    </>
  );
}
