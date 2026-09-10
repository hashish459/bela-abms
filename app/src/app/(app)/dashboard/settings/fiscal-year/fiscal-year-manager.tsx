"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Pencil, Plus } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, toast,
} from "@/components/ui";
import { adToBs, formatAdRange } from "@/lib/bs-date";

type FY = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string | null;
  active: boolean;
  isClosed: boolean;
};

export function FiscalYearManager({
  initial,
  canCreate,
  canUpdate,
}: {
  initial: FY[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FY | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Fiscal Year"]}
        title="Fiscal Year"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add fiscal year
            </Button>
          )
        }
      />

      <Card className="divide-y divide-border">
        {initial.length === 0 && (
          <p className="p-6 text-sm text-muted">No fiscal years yet.</p>
        )}
        {initial.map((fy) => (
          <div key={fy.id} className="flex items-center gap-4 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-tint text-accent">
              <CalendarCheck size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {fy.name}
                {fy.active && (
                  <span className="rounded bg-success/10 px-1.5 py-0.5 text-xs text-success">
                    Active
                  </span>
                )}
                {fy.isClosed && (
                  <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                    Closed
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                BS {fy.name} · AD {formatAdRange(fy.startDate, fy.endDate)}
              </p>
            </div>
            {canUpdate && (
              <Button variant="ghost" onClick={() => setEditing(fy)}>
                <Pencil size={14} /> Edit
              </Button>
            )}
          </div>
        ))}
      </Card>

      <p className="mt-3 text-xs text-muted">
        Dates are stored in AD (Gregorian) and shown alongside the Bikram Sambat label.
        Today is BS {adToBs(new Date())}.
      </p>

      {(creating || editing) && (
        <FiscalYearForm
          fy={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function FiscalYearForm({
  fy,
  onClose,
  onSaved,
}: {
  fy: FY | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(fy?.name ?? "");
  const [startDate, setStartDate] = useState(fy?.startDate ?? "");
  const [endDate, setEndDate] = useState(fy?.endDate ?? "");
  const [description, setDescription] = useState(fy?.description ?? "");
  const [active, setActive] = useState(fy?.active ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  async function save() {
    setSaving(true);
    setErr({});
    const body = { name, startDate, endDate, description, active };
    const res = await api<{ fiscalYear: unknown }>(
      fy ? `/api/settings/fiscal-years/${fy.id}` : "/api/settings/fiscal-years",
      { method: fy ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
    setSaving(false);
    if (!res.ok) {
      toast(res.error.message, "err");
      return;
    }
    toast(fy ? "Fiscal year updated" : "Fiscal year created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={fy ? "Update fiscal year" : "Add fiscal year"}>
      <div className="space-y-3">
        <Field label="Name" required hint="Bikram Sambat label, e.g. 2083-84" error={err.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2083-84" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date (AD)" required error={err.startDate}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date (AD)" required error={err.endDate}>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Description" error={err.description}>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Set as the active fiscal year
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {fy ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
