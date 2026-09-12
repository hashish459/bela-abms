"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";
import { LedgerPicker, type LedgerOption } from "@/components/ledger-picker";
import { adToBs } from "@/lib/bs-date";

type Row = {
  id: string; number: string; date: string; narration: string | null;
  amount: string; by: string;
};
type List = { rows: Row[]; total: number; page: number; pageSize: number };

export function VoucherWorkspace({
  type,
  title,
  initial,
  canCreate,
}: {
  type: "JOURNAL" | "CONTRA" | "EXPENSE";
  title: string;
  initial: List;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Vouchers", title]}
        title={title}
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New {title}
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Voucher No.</th>
              <th className="px-4 py-2 font-medium">Narration</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No {title.toLowerCase()}s yet.
                </td>
              </tr>
            )}
            {initial.rows.map((v) => (
              <tr key={v.id} className="hover:bg-accent-tint">
                <td className="px-4 py-2.5">
                  {v.date}
                  <span className="ml-1 text-xs text-muted">(BS {adToBs(v.date)})</span>
                </td>
                <td className="px-4 py-2.5 font-medium">{v.number}</td>
                <td className="px-4 py-2.5 text-muted">{v.narration || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">Rs. {v.amount}</td>
                <td className="px-4 py-2.5 text-muted">{v.by || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {initial.total > initial.pageSize && (
        <p className="mt-2 text-xs text-muted">
          Showing {initial.rows.length} of {initial.total}
        </p>
      )}

      {creating && (
        <VoucherForm
          type={type}
          title={title}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

type Line = {
  key: number;
  ledger: LedgerOption | null;
  debit: string;
  credit: string;
  narration: string;
};

let keyc = 0;
const emptyLine = (): Line => ({ key: ++keyc, ledger: null, debit: "", credit: "", narration: "" });

function VoucherForm({
  type,
  title,
  onClose,
  onSaved,
}: {
  type: "JOURNAL" | "CONTRA" | "EXPENSE";
  title: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  const ledgerQuery = type === "CONTRA" ? "heads=CCE" : "";

  const totalDr = lines.reduce((a, l) => a + (parseFloat(l.debit) || 0), 0);
  const totalCr = lines.reduce((a, l) => a + (parseFloat(l.credit) || 0), 0);
  const diff = totalDr - totalCr;
  const balanced = Math.abs(diff) < 0.005 && totalDr > 0;

  const patch = (key: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function save() {
    if (!balanced) return toast("Voucher must balance (Dr = Cr) and be non-zero", "err");
    const payloadLines = lines
      .filter((l) => l.ledger && (parseFloat(l.debit) || parseFloat(l.credit)))
      .map((l) => ({
        ledgerId: l.ledger!.id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        narration: l.narration,
      }));
    if (payloadLines.length < 2) return toast("Add at least two account lines", "err");

    setSaving(true);
    const res = await api<{ voucher: { number: string } }>("/api/accounts/vouchers", {
      method: "POST",
      body: JSON.stringify({ type, date, narration, lines: payloadLines }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`${title} ${res.data.voucher.number} posted`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`New ${title}`} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date (AD)" required hint={`BS ${adToBs(date)}`}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Particulars</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Debit</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Credit</th>
                <th className="px-2 py-2 font-medium">Narration</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.key}>
                  <td className="min-w-56 px-2 py-1.5">
                    <LedgerPicker
                      value={l.ledger}
                      onChange={(v) => patch(l.key, { ledger: v })}
                      query={ledgerQuery}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={l.debit}
                      onChange={(e) =>
                        patch(l.key, { debit: e.target.value, credit: e.target.value ? "" : l.credit })
                      }
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={l.credit}
                      onChange={(e) =>
                        patch(l.key, { credit: e.target.value, debit: e.target.value ? "" : l.debit })
                      }
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.narration}
                      onChange={(e) => patch(l.key, { narration: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {lines.length > 2 && (
                      <button
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-background text-sm font-medium">
              <tr>
                <td className="px-2 py-2 text-right">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{totalDr.toFixed(2)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{totalCr.toFixed(2)}</td>
                <td
                  className={`px-2 py-2 text-xs ${balanced ? "text-success" : "text-danger"}`}
                  colSpan={2}
                >
                  {balanced ? "Balanced" : `Difference: ${diff.toFixed(2)}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button
          onClick={() => setLines((ls) => [...ls, emptyLine()])}
          className="text-sm font-medium text-accent hover:underline"
        >
          + Add Account
        </button>

        <Field label="Narration">
          <Input value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!balanced}>
            Post Voucher
          </Button>
        </div>
      </div>
    </Modal>
  );
}
