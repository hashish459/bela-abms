import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { TourView } from "./tour-view";

export const metadata = { title: "Tour — Bela ABMS" };

export default async function TourPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "settings.tour", "read")) redirect("/dashboard");
  return <TourView />;
}
