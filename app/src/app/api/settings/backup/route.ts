import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { exportCompanyBackup } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId, session } = await guard("settings.backup_data", "read");
  const data = await exportCompanyBackup(companyId);
  await writeAudit({ userId: session.id, companyId, action: "BACKUP_EXPORT", entity: "Company", entityId: companyId });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bela-abms-backup-${stamp}.json"`,
    },
  });
});
