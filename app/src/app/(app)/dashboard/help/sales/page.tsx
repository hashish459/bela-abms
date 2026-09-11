import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, ExampleBox, TipBox, WarnBox, TAccountDiagram } from "@/components/manual";

export const metadata = { title: "Sales — User Manual" };

export default async function SalesManualPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Sales" />
      <ManualIntro>
        The Sales module covers the full order-to-cash cycle: quoting a customer, confirming
        their order, invoicing, collecting payment, and handling returns.
      </ManualIntro>

      <ManualSection title="The document chain">
        <FlowSteps
          steps={[
            { title: "Quotation", desc: "No GL impact — just a proposal", note: "optional" },
            { title: "Sales Order", desc: "Customer confirmed — still no GL impact", note: "optional" },
            { title: "Sales Invoice", desc: "Posts GL + stock OUT + COGS", note: "required" },
            { title: "Receipt", desc: "Records payment against the invoice" },
            { title: "Credit Note", desc: "Handles a return or correction" },
          ]}
        />
        <p>
          You can skip straight to a Sales Invoice for a walk-in cash sale — Quotation and
          Sales Order exist for customers who need to see a formal offer or confirm an order
          before you commit stock and post revenue.
        </p>
        <WarnBox>
          A Sales Invoice cannot be edited or deleted once saved — this is deliberate, not a
          bug. If something was wrong, issue a <strong>Credit Note</strong> against it instead.
          This keeps a permanent, honest audit trail of what actually happened, which is a
          legal requirement for VAT billing in Nepal.
        </WarnBox>
      </ManualSection>

      <ManualSection title="What happens when you save an invoice">
        <p>
          Behind one &quot;Save&quot; click, the system does four things atomically — either
          all four happen, or none do:
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Calculates totals server-side (line discount → VAT → header discount apportioned pro-rata across taxable lines only).</li>
          <li>Reduces stock for every goods line (blocked if there isn&apos;t enough on hand).</li>
          <li>Posts the sale to the ledger: <em>Dr Customer/Cash, Cr Sales, Cr VAT Payable.</em></li>
          <li>Posts the cost of what was sold: <em>Dr Cost of Goods Sold, Cr Inventory</em>, valued at the product&apos;s weighted-average cost.</li>
        </ol>
        <ExampleBox title="Selling 5 office chairs on credit">
          <p>5 chairs @ Rs. 4,500, VAT 13%, sold on credit to Everest Retail Store.</p>
          <p>Taxable amount: 5 × 4,500 = 22,500. VAT: 22,500 × 13% = 2,925. Grand total: 25,425.</p>
          <TAccountDiagram
            title="Sales Invoice — GL posting"
            debit={["Everest Retail Store  25,425"]}
            credit={["Sales  22,500", "Vat Payable  2,925"]}
          />
          <p>
            If each chair cost Rs. 3,675 on average to bring into stock, a second entry also
            posts: <em>Dr Cost of Goods Sold 18,375 / Cr Inventory 18,375</em> — this is what
            makes your Balance Sheet&apos;s inventory value and your P&amp;L&apos;s profit both
            accurate at the same time.
          </p>
        </ExampleBox>
      </ManualSection>

      <ManualSection title="Receipts & Credit Notes">
        <KeyConcepts
          items={[
            { term: "Receipt", def: "Records money received against a specific invoice (or on-account). Moves the invoice from Open → Partially Paid → Paid." },
            { term: "Credit Note", def: "Reverses part or all of an invoice — for returns, pricing corrections, or disputes. Reverses the GL, the stock, and the cost entry together, and is capped so you can never credit more than the invoice was worth." },
          ]}
        />
        <TipBox>
          A partial return doesn&apos;t change the original invoice&apos;s numbers (they stay
          as originally recorded, for audit purposes) — its <em>status</em> changes to
          &quot;Returned&quot; instead, and the Receivable Aging report accounts for the credit
          note separately when it calculates what the customer still owes.
        </TipBox>
      </ManualSection>

      <ManualSection title="Non-taxable & cash sales">
        <p>
          Mark a line (or a whole product) as <strong>Non-Taxable</strong> for VAT-exempt goods
          — the header discount only ever applies across taxable lines, so exempt sales
          are never distorted by a discount meant for taxed goods. For a walk-in customer
          with no ledger account, just type a name and pick a cash/bank payment mode —
          no customer record is required.
        </p>
      </ManualSection>
    </>
  );
}
