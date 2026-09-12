import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";

type Tx = Prisma.TransactionClient | typeof db;

export type CustomFieldDef = {
  id: string;
  label: string;
  fieldType: string; // TEXT | NUMBER | DATE | SELECT | CHECKBOX
  options: string[] | null;
  required: boolean;
  order: number;
};

/** Active field definitions for one module, in display order — what a create
 * form fetches to know what extra inputs to render. */
export async function listActiveCustomFields(companyId: string, module: string): Promise<CustomFieldDef[]> {
  const rows = await db.customField.findMany({
    where: { companyId, module, isActive: true, deletedAt: null },
    orderBy: { order: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    fieldType: r.fieldType,
    options: (r.options as string[] | null) ?? null,
    required: r.required,
    order: r.order,
  }));
}

/**
 * Validates a raw `{customFieldId: value}` map against this module's active
 * definitions (required-ness only — a missing/blank required field is
 * rejected; type coercion is intentionally loose since these are all stored
 * as text) and returns rows ready to persist. Ignores any fieldId that
 * isn't an active definition for this module, so a stale/inactive field in
 * the payload is silently dropped rather than erroring.
 */
export async function prepareCustomFieldValues(
  companyId: string,
  module: string,
  raw: Record<string, unknown> | undefined,
  tx: Tx = db,
): Promise<{ customFieldId: string; value: string | null }[]> {
  const defs = await tx.customField.findMany({ where: { companyId, module, isActive: true, deletedAt: null } });
  const input = raw ?? {};
  const rows: { customFieldId: string; value: string | null }[] = [];
  for (const def of defs) {
    const v = input[def.id];
    const blank = v === undefined || v === null || v === "";
    if (def.required && blank) throw errors.validation(null, `"${def.label}" is required`);
    if (v === undefined) continue;
    rows.push({ customFieldId: def.id, value: def.fieldType === "CHECKBOX" ? (v ? "true" : "false") : blank ? null : String(v) });
  }
  return rows;
}

/** Persists prepared values against one entity — upserts, so re-saving (an
 * edit flow) just overwrites rather than duplicating rows. */
export async function saveCustomFieldValues(
  tx: Tx,
  companyId: string,
  entityId: string,
  values: { customFieldId: string; value: string | null }[],
) {
  for (const v of values) {
    await tx.customFieldValue.upsert({
      where: { customFieldId_entityId: { customFieldId: v.customFieldId, entityId } },
      create: { companyId, customFieldId: v.customFieldId, entityId, value: v.value },
      update: { value: v.value },
    });
  }
}

/** Definitions + current values for one entity's detail/edit view, in order. */
export async function getCustomFieldValuesForEntity(companyId: string, module: string, entityId: string) {
  const [defs, values] = await Promise.all([
    listActiveCustomFields(companyId, module),
    db.customFieldValue.findMany({ where: { companyId, entityId } }),
  ]);
  const valueByFieldId = new Map(values.map((v) => [v.customFieldId, v.value]));
  return defs.map((d) => ({ ...d, value: valueByFieldId.get(d.id) ?? null }));
}

/** Compact "Label: Value, Label2: Value2" string for a list-page column —
 * `null` when the entity has nothing set, so the caller can render "—". */
export function summarizeCustomFields(
  values: { label: string; fieldType: string; value: string | null }[] | undefined,
): string | null {
  if (!values || !values.length) return null;
  const parts = values
    .filter((v) => v.value !== null && v.value !== "")
    .map((v) => `${v.label}: ${v.fieldType === "CHECKBOX" ? (v.value === "true" ? "Yes" : "No") : v.value}`);
  return parts.length ? parts.join(", ") : null;
}

/** Definitions + values for many entities at once, for a list page column. */
export async function getCustomFieldValuesForEntities(
  companyId: string,
  module: string,
  entityIds: string[],
): Promise<Map<string, { label: string; fieldType: string; value: string | null }[]>> {
  const byEntity = new Map<string, { label: string; fieldType: string; value: string | null }[]>();
  if (!entityIds.length) return byEntity;
  const [defs, values] = await Promise.all([
    listActiveCustomFields(companyId, module),
    db.customFieldValue.findMany({ where: { companyId, entityId: { in: entityIds } } }),
  ]);
  const defById = new Map(defs.map((d) => [d.id, d]));
  for (const v of values) {
    const def = defById.get(v.customFieldId);
    if (!def) continue;
    if (!byEntity.has(v.entityId)) byEntity.set(v.entityId, []);
    byEntity.get(v.entityId)!.push({ label: def.label, fieldType: def.fieldType, value: v.value });
  }
  return byEntity;
}
