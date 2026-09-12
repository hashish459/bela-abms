"use client";

import { DownloadCloud } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";

export function BackupDataView() {
  return (
    <>
      <PageHeader crumbs={["Settings", "Backup Data"]} title="Backup Data" />
      <p className="mb-3 text-sm text-muted">
        Download a full export of this company&apos;s data — fiscal years, chart of accounts,
        vouchers, products, sales/purchase documents and more — as one JSON file.
      </p>

      <Card className="max-w-xl p-5">
        <p className="mb-4 text-sm text-muted">
          Restore is not built yet — treat this as an offline archive, not a swap-back path.
        </p>
        <a href="/api/settings/backup">
          <Button>
            <DownloadCloud size={15} /> Download backup
          </Button>
        </a>
      </Card>
    </>
  );
}
