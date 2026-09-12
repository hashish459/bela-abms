"use client";

import { useEffect, useState } from "react";
import { Field, Input, inputClass } from "@/components/ui";

type FieldDef = {
  id: string;
  label: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | string;
  options: string[] | null;
  required: boolean;
};

/**
 * Renders whatever extra fields Settings › Custom Fields has defined for
 * `module` — nothing if none are defined. `values` is keyed by CustomField
 * id (not label, since labels aren't guaranteed unique/stable) and gets
 * spread straight into the create/update payload's `customFields` object.
 */
export function CustomFieldsFields({
  module,
  values,
  onChange,
  gridClassName = "grid gap-3 sm:grid-cols-2",
  heading = "Custom Fields",
}: {
  module: string;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  /** Tailwind grid classes for the field layout — match the surrounding form's own grid. */
  gridClassName?: string;
  /** Section heading, or `null` to render the fields with no wrapping section/heading. */
  heading?: string | null;
}) {
  const [defs, setDefs] = useState<FieldDef[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/custom-fields?module=${encodeURIComponent(module)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.ok) setDefs(json.data.fields);
        })
        .catch(() => void 0);
    }, 0);
    return () => clearTimeout(t);
  }, [module]);

  // Renders nothing at all — no empty heading, no empty grid — until fields
  // are known to exist, so a module with no custom fields defined shows no
  // trace of this section in its create form.
  if (!defs || defs.length === 0) return null;

  const grid = (
    <div className={gridClassName}>
      {defs.map((d) => (
        <Field key={d.id} label={d.label} required={d.required}>
          {d.fieldType === "CHECKBOX" ? (
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values[d.id] === "true"}
                onChange={(e) => onChange(d.id, e.target.checked ? "true" : "false")}
              />
              {d.label}
            </label>
          ) : d.fieldType === "SELECT" ? (
            <select value={values[d.id] ?? ""} onChange={(e) => onChange(d.id, e.target.value)} className={inputClass}>
              <option value="">— Select —</option>
              {(d.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : d.fieldType === "DATE" ? (
            <Input type="date" value={values[d.id] ?? ""} onChange={(e) => onChange(d.id, e.target.value)} />
          ) : d.fieldType === "NUMBER" ? (
            <Input type="number" value={values[d.id] ?? ""} onChange={(e) => onChange(d.id, e.target.value)} />
          ) : (
            <Input value={values[d.id] ?? ""} onChange={(e) => onChange(d.id, e.target.value)} />
          )}
        </Field>
      ))}
    </div>
  );

  if (heading === null) return grid;

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{heading}</h3>
      {grid}
    </section>
  );
}

/** Read-only rendering of an entity's saved custom field values — the detail-page counterpart. */
export function CustomFieldsDisplay({
  values,
}: {
  values: { label: string; fieldType: string; value: string | null }[];
}) {
  const shown = values.filter((v) => v.value !== null && v.value !== "");
  if (shown.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {shown.map((v) => (
        <div key={v.label}>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{v.label}</div>
          <div className="mt-0.5 text-sm">
            {v.fieldType === "CHECKBOX" ? (v.value === "true" ? "Yes" : "No") : v.value}
          </div>
        </div>
      ))}
    </div>
  );
}
