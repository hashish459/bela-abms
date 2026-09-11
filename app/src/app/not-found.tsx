import { getSession } from "@/lib/auth";
import { NotFoundContent } from "@/components/status-page";

export const metadata = { title: "Page not found — Bela Nepal Industries" };

export default async function NotFound() {
  const session = await getSession();
  return <NotFoundContent isLoggedIn={!!session} />;
}
