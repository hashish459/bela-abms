import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, ExampleBox, TipBox, TAccountDiagram } from "@/components/manual";

export const metadata = { title: "Accounts & GL — User Manual" };

export default async function AccountsGlPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Accounts & General Ledger" />
      <ManualIntro>
        The Chart of Accounts and the General Ledger are the foundation everything else is
        built on. If you understand these two things, every other module — Sales, Purchase,
        Reports — will make sense as &quot;just a form that fills in the ledger for you.&quot;
      </ManualIntro>

      <ManualSection title="The 3-level Chart of Accounts">
        <p>
          Every account in the system (called a <strong>Ledger</strong>) sits inside exactly
          one of 36 <strong>Account Heads</strong> (Assets, Liabilities, Equity, Income,
          Expense — and their sub-divisions), grouped further into <strong>Account Groups</strong>.
          This mirrors Nepal&apos;s NFRS (Nepal Financial Reporting Standards) structure.
        </p>
        <FlowSteps
          steps={[
            { title: "Account Head", desc: "e.g. \"Current Assets\"", note: "36 heads" },
            { title: "Account Group", desc: "e.g. \"Cash & Cash Equivalents\"", note: "106 groups" },
            { title: "Ledger", desc: "e.g. \"Cash In Hand\" — code CCE-02-0001", note: "183 ledgers" },
          ]}
        />
        <TipBox>
          Every customer and supplier you create is <em>also</em> a Ledger — filed under Trade
          Receivable (customers) or Trade Payable (suppliers). That&apos;s why a customer&apos;s
          running balance shows up correctly in Trial Balance and Balance Sheet without any
          special-casing.
        </TipBox>
      </ManualSection>

      <ManualSection title="Double-entry, in one picture">
        <p>
          Every financial event touches at least two ledgers: one <strong>Debit</strong>, one
          <strong> Credit</strong>, always equal. The system enforces this — it is physically
          impossible to save an unbalanced voucher.
        </p>
        <TAccountDiagram
          title="Cash In Hand"
          debit={["Opening balance: 50,000", "Customer payment: 10,000"]}
          credit={["Paid supplier: 25,000", "Rent paid: 15,000"]}
        />
        <p className="text-center text-xs text-muted">
          Closing balance = (Debits − Credits) = 50,000 + 10,000 − 25,000 − 15,000 = 20,000 Dr
        </p>
      </ManualSection>

      <ManualSection title="Journal & Contra Vouchers">
        <p>
          For anything that isn&apos;t a sale or purchase — rent, depreciation, bank transfers,
          corrections — use a manual voucher under <strong>Vouchers</strong>.
        </p>
        <KeyConcepts
          items={[
            { term: "Journal Voucher", def: "Any balanced Dr/Cr entry between any two (or more) ledgers." },
            { term: "Contra Voucher", def: "Restricted to cash-and-bank ledgers only — for transfers like \"deposit cash into the bank.\"" },
          ]}
        />
        <ExampleBox title="Recording August office rent">
          <p>Paid Rs. 25,000 rent by bank transfer on 12 Aug 2026.</p>
          <TAccountDiagram title="Journal Voucher" debit={["Office Rent  25,000"]} credit={["Bank Account  25,000"]} />
        </ExampleBox>
      </ManualSection>

      <ManualSection title="Trial Balance & Ledger Report">
        <p>
          <strong>Trial Balance</strong> lists every account&apos;s Debit and Credit total for
          the fiscal year — if the two grand totals don&apos;t match, something is deeply
          wrong (in practice, this can&apos;t happen, because every voucher was balanced when
          it was posted). <strong>Ledger Report</strong> shows the same thing for a single
          account, as a running balance over time — use it to answer &quot;how much does this
          customer currently owe us?&quot;
        </p>
      </ManualSection>
    </>
  );
}
