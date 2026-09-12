import { ok, handler, errors } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listActiveCustomFields } from "@/server/custom-fields/service";

// Read-only lookup used by entry forms to know which extra fields to render.
// Gated on being signed in only (like ProductPicker's own lookup), not on
// settings.custom_fields — that permission governs managing definitions, not
// using them while filling out a Sales Invoice, Product, etc.
export const GET = handler(async (req: Request) => {
  const session = await requireSession();
  if (!session.companyId) throw errors.badRequest("No active company selected");
  const url = new URL(req.url);
  const moduleParam = url.searchParams.get("module");
  if (!moduleParam) throw errors.badRequest("module is required");
  return ok({ fields: await listActiveCustomFields(session.companyId, moduleParam) });
});
