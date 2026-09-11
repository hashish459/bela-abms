import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, ExampleBox, TipBox, TAccountDiagram } from "@/components/manual";

export const metadata = { title: "Purchase — User Manual" };

export default async function PurchaseManualPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Purchase" />
      <ManualIntro>
        The Purchase module mirrors Sales from the buying side: ordering from a supplier,
        recording the bill, paying it, and handling returns — with one important twist for
        imported goods: <strong>landed cost</strong>.
      </ManualIntro>

      <ManualSection title="The document chain">
        <FlowSteps
          steps={[
            { title: "Purchase Order", desc: "What you intend to buy — no GL impact", note: "optional" },
            { title: "Purchase Invoice", desc: "The supplier's actual bill — posts GL + stock IN", note: "required" },
            { title: "Payment", desc: "Records what you paid the supplier" },
            { title: "Debit Note", desc: "Returns goods to the supplier" },
          ]}
        />
      </ManualSection>

      <ManualSection title="Landed cost: why excise & custom duty are capitalized">
        <p>
          When you import goods, excise duty and customs duty aren&apos;t just an expense you
          write off — they&apos;re part of what that stock actually cost you to acquire. So
          instead of expensing them, the system adds them into the product&apos;s stock value
          (its <strong>landed cost</strong>), the same way a real accountant would.
        </p>
        <ExampleBox title="Importing 10 desks with duty">
          <p>10 desks @ Rs. 8,000, plus Rs. 1,000 excise duty and Rs. 500 customs duty (both header-level, no discount), VAT 13%.</p>
          <p>Landed cost = (10 × 8,000) + 1,000 + 500 = 81,500 → landed <strong>per unit</strong> = 8,150.</p>
          <p>VAT is calculated on the full landed amount: 81,500 × 13% = 10,595.</p>
          <TAccountDiagram
            title="Purchase Invoice — GL posting"
            debit={["Inventory  81,500", "Vat Receivable  10,595"]}
            credit={["Nepal Wholesale Suppliers  92,095"]}
          />
          <p>
            Every future sale of these desks uses <strong>8,150</strong> as their cost basis
            (blended with any other purchases of the same product, as a running weighted
            average) — not the original Rs. 8,000 rate. This is what makes your gross profit
            figures accurate once duty is involved.
          </p>
        </ExampleBox>
        <TipBox>
          A header-level discount on a purchase invoice reduces the amount actually
          capitalized to Inventory (not the pre-discount landed figure) — the system tracks
          both internally so the GL always balances exactly to the paisa.
        </TipBox>
      </ManualSection>

      <ManualSection title="Payments & Debit Notes">
        <KeyConcepts
          items={[
            { term: "Payment", def: "Records money paid to a supplier against a specific invoice (or on-account). Moves the invoice Open → Partially Paid → Paid." },
            { term: "Debit Note", def: "Returns goods to the supplier. Valued at that same invoice's own landed cost — never at today's blended average, which may have drifted since — so the reversal always balances exactly." },
          ]}
        />
      </ManualSection>

      <ManualSection title="Non-goods lines: expenses on a purchase bill">
        <p>
          A purchase invoice line doesn&apos;t have to be a stock item — pick a
          <strong> Service</strong> or <strong>Expense</strong> product (e.g. an installation
          service, a delivery charge) and it posts straight to a Purchase Expense ledger
          instead of Inventory, with VAT still calculated correctly.
        </p>
      </ManualSection>
    </>
  );
}
