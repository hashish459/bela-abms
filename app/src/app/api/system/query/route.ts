import { z } from "zod";
import { ok, handler, errors } from "@/lib/api";
import { guard } from "@/lib/guard";
import { runDiagnosticQuery } from "@/server/system/service";

const body = z.object({ sql: z.string().min(1).max(4000) });

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("system.database_console", "read");
  const { sql } = body.parse(await req.json());
  try {
    return ok(await runDiagnosticQuery(sql, session.id, companyId));
  } catch (e) {
    throw errors.validation(null, e instanceof Error ? e.message : "Query failed");
  }
});
