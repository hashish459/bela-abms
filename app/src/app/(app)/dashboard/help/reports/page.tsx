import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader, Card } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, ExampleBox, TipBox } from "@/components/manual";

export const metadata = { title: "Reports — User Manual" };

export default async function ReportsManualPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Reports" />
      <ManualIntro>
        Every report reads directly from the General Ledger and the sales/purchase documents —
        none of them store their own numbers. That means they can never drift out of sync
        with each other; they&apos;re just different views of the same underlying truth.
      </ManualIntro>

      <ManualSection title="What each report tells you">
        <KeyConcepts
          items={[
            { term: "Trial Balance", def: "Every account's total debit and credit for the fiscal year. Always ties — if it didn't, a voucher would have been rejected before it got this far." },
            { term: "Ledger Report", def: "One account's running balance over time, transaction by transaction. \"How much does this customer currently owe, and from what?\"" },
            { term: "Profit & Loss", def: "Income minus Expense for a date range. \"Did we make money this period?\"" },
            { term: "Balance Sheet", def: "Assets vs Liabilities + Equity, as of a date. \"What do we own, and who has a claim on it?\"" },
            { term: "Day Book", def: "Every voucher posted on one specific day, in full detail. \"What actually happened today?\"" },
            { term: "VAT Return", def: "Output VAT (from sales) vs Input VAT (from purchases) for a period — the number you'd report to IRD." },
            { term: "Receivable / Payable Aging", def: "Outstanding invoices bucketed by how overdue they are (0-30 / 31-60 / 61-90 / 90+ days). \"Who owes us money, and how late is it?\"" },
          ]}
        />
      </ManualSection>

      <ManualSection title="Why the Balance Sheet always balances">
        <p>
          This isn&apos;t a coincidence — it&apos;s a mathematical guarantee. Every voucher
          ever posted has equal debits and credits. Add them all up across every account and
          you get:
        </p>
        <Card className="p-4 text-center font-mono text-sm">
          Assets = Liabilities + Equity + (Income − Expense)
        </Card>
        <p>
          The Balance Sheet report adds that last part — the current period&apos;s not-yet-
          closed profit or loss — as a single &quot;Current Year Profit&quot; line under
          Equity. If Assets ever stopped equalling Liabilities + Equity, it would mean a
          voucher was posted outside the normal system (it can&apos;t be) — the report would
          flag it in red rather than pretend everything is fine.
        </p>
      </ManualSection>

      <ManualSection title="Worked example: one sale, five reports">
        <ExampleBox title="A single Rs. 25,425 credit sale, seen five ways">
          <p>You sell 5 chairs on credit for Rs. 25,425 (incl. VAT). Here&apos;s where it shows up:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Trial Balance</strong> — the customer&apos;s ledger debit total goes up by 25,425.</li>
            <li><strong>Ledger Report</strong> (for that customer) — a new line appears, running balance updated.</li>
            <li><strong>Profit &amp; Loss</strong> — Sales income increases by 22,500 (the VAT-exclusive amount).</li>
            <li><strong>Balance Sheet</strong> — Accounts Receivable (an asset) increases by 25,425; Equity increases via the profit.</li>
            <li><strong>Receivable Aging</strong> — a new outstanding amount appears in the &quot;0-30 days&quot; bucket, moving to later buckets as time passes without payment.</li>
          </ul>
        </ExampleBox>
        <TipBox>
          A Credit Note or a Receipt against that invoice later doesn&apos;t change the
          original invoice&apos;s numbers — Aging and the Ledger both account for it as a
          separate, linked entry, so you can always trace exactly what happened and when.
        </TipBox>
      </ManualSection>
    </>
  );
}
