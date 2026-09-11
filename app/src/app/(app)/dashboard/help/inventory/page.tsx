import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ManualIntro, ManualSection, KeyConcepts, FlowSteps, ExampleBox, TipBox } from "@/components/manual";

export const metadata = { title: "Inventory — User Manual" };

export default async function InventoryManualPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "help.user_manuals", "read")) redirect("/dashboard");

  return (
    <>
      <PageHeader crumbs={["Help", "User Manual"]} title="Inventory" />
      <ManualIntro>
        Inventory tracks what you have, where it is, and what it&apos;s worth — every stock
        change in the system, from a sale to a damage write-off, is a single, traceable
        <strong> Stock Movement</strong>.
      </ManualIntro>

      <ManualSection title="The building blocks">
        <KeyConcepts
          items={[
            { term: "Product", def: "Goods (physical stock), Service (no stock, e.g. installation), or Expense (a cost line item, e.g. delivery charge)." },
            { term: "Category / Unit / Warehouse", def: "Organise products, define how they're measured (Pieces, Kg, Packet…), and where stock physically sits." },
            { term: "Stock Movement", def: "A signed quantity change (+in / -out) with a reason (Opening, Sale, Purchase, Adjustment…). On-hand quantity is always the sum of these — never a separately-edited number." },
            { term: "Weighted Average Cost", def: "Σ(quantity × unit cost of every inbound movement) ÷ Σ(quantity). This is what values every sale's cost of goods and every return's reversal." },
          ]}
        />
      </ManualSection>

      <ManualSection title="How on-hand quantity is always correct">
        <FlowSteps
          steps={[
            { title: "Opening stock", desc: "+50 (product created)" },
            { title: "Purchase", desc: "+20 (invoice posted)" },
            { title: "Sale", desc: "-5 (invoice posted)" },
            { title: "Damage", desc: "-2 (adjustment)" },
            { title: "On hand = 63", desc: "Sum of every movement", note: "never edited directly" },
          ]}
        />
        <TipBox>
          Because on-hand quantity is always <em>derived</em> from movement history rather
          than stored and edited directly, it&apos;s mathematically impossible for stock to
          silently drift out of sync with what actually happened — every number traces back
          to a specific sale, purchase, or adjustment.
        </TipBox>
      </ManualSection>

      <ManualSection title="Inventory Adjustment">
        <p>
          Use this for anything that isn&apos;t a sale or purchase: damage, expiry, a physical
          recount, or a manual correction.
        </p>
        <ExampleBox title="Writing off damaged stock">
          <p>5 LED bulbs damaged by water in the warehouse.</p>
          <p>
            Adjustment type <strong>Damage</strong>, quantity <strong>-5</strong> → on-hand
            drops by 5 immediately, with a permanent record of why.
          </p>
        </ExampleBox>
      </ManualSection>

      <ManualSection title="Overselling is blocked, not silently allowed">
        <p>
          If you try to sell more of a product than is currently on hand, the system rejects
          the sale rather than letting your stock go negative and quietly corrupting your
          cost calculations. If you genuinely need to allow negative stock (e.g. you know
          more is arriving today), that has to be an explicit, deliberate choice — it is
          never the default.
        </p>
      </ManualSection>
    </>
  );
}
