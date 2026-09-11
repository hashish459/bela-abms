"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, Input, PageHeader } from "@/components/ui";

type Money = { taxable: string; nonTaxable: string; vat: string };
type VatReturn = {
  sales: Money;
  purchase: Money;
  outputVat: string;
  inputVat: string;
  netPayable: string;
};

export function VatReturnView({
  fyName,
  defaultFrom,
  defaultTo,
}: {
  fyName: string;
  defaultFrom: string;
  defaultTo: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<VatReturn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<VatReturn>(`/api/reports/vat-return?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to]);

  const payable = data ? Number(data.netPayable) >= 0 : true;

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Tax", "VAT Return"]}
        title="VAT Return"
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <p className="mb-3 text-sm text-muted">
        Fiscal year <strong>{fyName}</strong> · output VAT (sales, net of credit notes) vs input VAT
        (purchase, net of debit notes) for the selected period.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Sales (Output)
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2.5">Taxable sales</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.sales.taxable}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Non-taxable sales</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.sales.nonTaxable}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-4 py-2.5">Output VAT</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.outputVat}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Purchase (Input)
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2.5">Taxable purchase</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.purchase.taxable}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Non-taxable purchase</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.purchase.nonTaxable}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-4 py-2.5">Input VAT</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{data.inputVat}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>

          <Card className={`mt-4 p-4 text-right ${payable ? "text-foreground" : "text-success"}`}>
            <span className="text-sm font-medium">
              {payable ? "Net VAT payable to IRD" : "Net VAT refundable / carried forward"}:{" "}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              Rs. {payable ? data.netPayable : data.netPayable.replace("-", "")}
            </span>
          </Card>
        </>
      )}
    </>
  );
}
