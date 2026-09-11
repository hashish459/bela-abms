import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The Reports catalogue (`/dashboard/reports`, see reports-catalogue.tsx) is
 * the primary way in — with ~20 reports across 8 groups a flat tab bar
 * stopped scaling, so every report page just links back to it instead.
 */
export default async function ReportsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="space-y-4">
      <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" data-app-chrome>
        <ArrowLeft size={13} /> All Reports
      </Link>
      {children}
    </div>
  );
}
