"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import {
  api, Button, Card, Field, Input, Modal, PageHeader, inputClass, toast,
} from "@/components/ui";

type Ledger = {
  id: string; code: string; name: string; isSystem: boolean; isActive: boolean;
  openingBalance: string; openingType: "DR" | "CR"; contactKind: string | null;
};
type Group = { id: string; code: string; name: string; isSystem: boolean; ledgers: Ledger[] };
type Head = {
  id: string; code: string; name: string; accountType: string;
  currentType: string; financialType: string; groups: Group[];
};
type GroupOption = {
  id: string; code: string; name: string;
  accountHead: { name: string; code: string; accountType: string };
};

const TYPE_LABEL: Record<string, string> = {
  AS: "Assets", LI: "Liabilities", EQ: "Equity", IN: "Income", EX: "Expense",
};

export function ChartOfAccounts({
  heads,
  groups,
  canCreate,
  canDelete,
}: {
  heads: Head[];
  groups: GroupOption[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openHeads, setOpenHeads] = useState<Set<string>>(new Set());

  const byType = useMemo(() => {
    const m = new Map<string, Head[]>();
    for (const h of heads) {
      if (!m.has(h.accountType)) m.set(h.accountType, []);
      m.get(h.accountType)!.push(h);
    }
    return m;
  }, [heads]);

  const filter = (l: Ledger) =>
    !q ||
    l.name.toLowerCase().includes(q.toLowerCase()) ||
    l.code.toLowerCase().includes(q.toLowerCase());

  const totalLedgers = heads.reduce(
    (a, h) => a + h.groups.reduce((b, g) => b + g.ledgers.length, 0),
    0,
  );

  async function remove(l: Ledger) {
    if (!confirm(`Delete account "${l.name}"?`)) return;
    const res = await api(`/api/accounts/ledgers/${l.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Account deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Accounts", "Charts of Accounts"]}
        title="Chart of Accounts"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add Account
            </Button>
          )
        }
      />

      <div className="mb-3 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accounts"
            className={`${inputClass} pl-9`}
          />
        </div>
        <span className="text-xs text-muted">
          {heads.length} heads · {totalLedgers} ledgers
        </span>
      </div>

      <div className="space-y-4">
        {["AS", "LI", "EQ", "IN", "EX"].map((t) => {
          const ths = byType.get(t) ?? [];
          if (!ths.length) return null;
          return (
            <Card key={t} className="overflow-hidden">
              <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {TYPE_LABEL[t]}
              </div>
              <div className="divide-y divide-border">
                {ths.map((h) => {
                  const opened = openHeads.has(h.id) || q.length > 0;
                  const visibleGroups = h.groups
                    .map((g) => ({ ...g, ledgers: g.ledgers.filter(filter) }))
                    .filter((g) => !q || g.ledgers.length > 0);
                  if (q && visibleGroups.length === 0) return null;
                  return (
                    <div key={h.id}>
                      <button
                        onClick={() =>
                          setOpenHeads((s) => {
                            const n = new Set(s);
                            if (n.has(h.id)) n.delete(h.id);
                            else n.add(h.id);
                            return n;
                          })
                        }
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium hover:bg-accent-tint"
                      >
                        <ChevronRight
                          size={14}
                          className={`shrink-0 text-muted transition-transform ${opened ? "rotate-90" : ""}`}
                        />
                        <span className="flex-1">{h.name}</span>
                        <span className="text-xs text-muted">{h.code}</span>
                      </button>
                      {opened && (
                        <div className="bg-background/40 pb-2">
                          {visibleGroups.map((g) => (
                            <div key={g.id} className="ml-6">
                              <p className="px-4 py-1.5 text-xs font-semibold text-muted">
                                {g.name} <span className="font-normal">· {g.code}</span>
                              </p>
                              {g.ledgers.map((l) => (
                                <div
                                  key={l.id}
                                  className="flex items-center gap-2 px-4 py-1.5 text-sm"
                                >
                                  <span className="flex-1">
                                    {l.name}
                                    {l.contactKind && (
                                      <span className="ml-1.5 rounded bg-accent-tint px-1 py-0.5 text-[10px] text-accent">
                                        {l.contactKind.toLowerCase()}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-muted">{l.code}</span>
                                  {canDelete && !l.isSystem && (
                                    <button
                                      onClick={() => remove(l)}
                                      className="text-muted hover:text-danger"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {creating && (
        <AddAccountModal
          groups={groups}
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

function AddAccountModal({
  groups,
  onClose,
  onSaved,
}: {
  groups: GroupOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [accountGroupId, setGroupId] = useState("");
  const [openingBalance, setOpening] = useState("0");
  const [openingType, setOpeningType] = useState<"DR" | "CR">("DR");
  const [panNumber, setPan] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api("/api/accounts/ledgers", {
      method: "POST",
      body: JSON.stringify({
        name, accountGroupId, openingBalance: Number(openingBalance), openingType, panNumber,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Account created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Add Account">
      <div className="space-y-3">
        <Field label="Account Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Group Head" required hint="Which NFRS grouping this account sits under">
          <select
            value={accountGroupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.accountHead.name} › {g.name} ({g.code})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Opening Balance">
            <Input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpening(e.target.value)}
            />
          </Field>
          <Field label="Dr/Cr">
            <select
              value={openingType}
              onChange={(e) => setOpeningType(e.target.value as "DR" | "CR")}
              className={inputClass}
            >
              <option value="DR">DR</option>
              <option value="CR">CR</option>
            </select>
          </Field>
        </div>
        <Field label="PAN Number">
          <Input value={panNumber} onChange={(e) => setPan(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!name || !accountGroupId}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
