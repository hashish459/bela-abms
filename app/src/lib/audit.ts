import "server-only";
import { db } from "./db";

export type AuditInput = {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
};

/** Fire-and-forget audit write; never throws into the caller's flow. */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        companyId: input.companyId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta as object | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write:", e);
  }
}

export function clientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}
