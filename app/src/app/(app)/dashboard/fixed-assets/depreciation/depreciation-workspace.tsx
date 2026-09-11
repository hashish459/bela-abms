"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, toast } from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Run = { id: string; asOfDate: string; assetCount: number; totalAmount: string };

export function DepreciationWorkspace({
  initial, activeAssetCount, canRun, hasFiscalYear,
}: {
  initial: Run[]; activeAssetCount: number; canRun: boolean; hasFiscalYear: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Fixed Assets", "Depreciation"]}
        title="Depreciation"
        action={
          canRun && hasFiscalYear && (
            <Button onClick={() => setRunning(true)}>
              <Play size={15} /> Run Depreciation
            </Button>
          )
        }
      />
      {!hasFiscalYear && (
        <Card className="mb-3 p-3 text-sm text-danger">
          Set an active fiscal year in Settings › Fiscal Year before running depreciation.
        </Card>
      )}
      <p className="mb-3 text-xs text-muted">
        {activeAssetCount} depreciable asset(s) on the register (Land is excluded). Running
        depreciation posts one balanced voucher — Dr Depreciation Expense / Cr Accumulated
        Depreciation, grouped per category — for every asset due since its last run.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No depreciation runs yet" hint="Run depreciation to post this period's charge." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">As of</th>
                <th className="px-4 py-2 text-right font-medium">Assets</th>
                <th className="px-4 py-2 text-right font-medium">Total Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">
                    {r.asOfDate} <span className="text-xs text-muted">(BS {adToBs(r.asOfDate)})</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.assetCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">Rs. {r.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {running && (
        <RunForm
          onClose={() => setRunning(false)}
          onSaved={() => {
            setRunning(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RunForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [saving, setSaving] = useState(false);

  async function run() {
    setSaving(true);
    const res = await api<{ assetCount: number; totalAmount: string }>("/api/assets/depreciation-runs", {
      method: "POST",
      body: JSON.stringify({ asOfDate }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(`Depreciation posted for ${res.data.assetCount} asset(s) — Rs. ${res.data.totalAmount}`);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Run Depreciation">
      <div className="space-y-3">
        <Field label="As of date (AD)" required hint={`BS ${adToBs(asOfDate)}`}>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">
          Only whole months since each asset&apos;s last depreciation entry (or acquisition,
          if never run) are charged. An asset with less than a month elapsed is skipped this
          run, not double-charged later.
        </p>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={run}>Run</Button>
      </div>
    </Modal>
  );
}
