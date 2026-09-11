import { BrandLogo } from "@/components/brand-logo";

/** Shown inside the dashboard shell (sidebar/header stay visible) while a page's
 * own data is loading — lighter than the full-page splash in the root loading.tsx. */
export default function DashboardLoading() {
  return (
    <div className="grid h-full min-h-[50vh] place-items-center">
      <BrandLogo size={44} className="brand-pulse opacity-70" />
    </div>
  );
}
