"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, toast } from "@/components/ui";

export type StatusTagOption = { id: string; label: string; color: string };
export type StatusTag = { id: string; label: string; color: string } | null;

/** Editable "Custom Status" badge (Settings › Custom Status) — purely descriptive
 * metadata on an otherwise-immutable invoice, so unlike every other field here it can
 * be changed freely after the document is created. Renders nothing (not even the
 * on-screen "no tag" placeholder) when printed — see the `data-app-chrome` wrapper. */
export function StatusTagPicker({
  apiPath,
  current,
  options,
  canEdit,
}: {
  apiPath: string;
  current: StatusTag;
  options: StatusTagOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function change(id: string) {
    setSaving(true);
    const res = await api(apiPath, {
      method: "PATCH",
      body: JSON.stringify({ customStatusId: id || null }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    router.refresh();
  }

  if (!canEdit && !current) return null;

  return (
    <div className="text-xs" data-app-chrome>
      {canEdit ? (
        <select
          value={current?.id ?? ""}
          disabled={saving}
          onChange={(e) => change(e.target.value)}
          className="rounded-full border-0 px-2 py-1 text-xs font-medium outline-none ring-1 ring-border"
          style={current ? { backgroundColor: `${current.color}22`, color: current.color } : undefined}
        >
          <option value="">No tag</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      ) : current ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
          style={{ backgroundColor: `${current.color}22`, color: current.color }}
        >
          {current.label}
        </span>
      ) : null}
    </div>
  );
}
