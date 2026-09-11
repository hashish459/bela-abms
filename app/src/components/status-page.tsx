"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Compass, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AppearancePanel } from "@/components/appearance-panel";
import { useTranslation } from "@/lib/i18n";

/** Shared full-screen layout for 404 / error pages — on-brand, not a bare stack trace. */
function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4">
      <div className="absolute right-4 top-4">
        <AppearancePanel />
      </div>
      {/* Soft decorative glow — purely visual, respects reduce-motion via no animation here */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-tint blur-3xl"
      />
      <div className="relative w-full max-w-md text-center">
        <BrandLogo size={64} className="mx-auto mb-6" />
        {children}
      </div>
    </main>
  );
}

export function NotFoundContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useTranslation();
  return (
    <StatusShell>
      <div className="mb-2 flex items-center justify-center gap-3">
        <span className="text-6xl font-extrabold tracking-tight text-accent">4</span>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-tint text-accent brand-pulse">
          <Compass size={28} />
        </span>
        <span className="text-6xl font-extrabold tracking-tight text-accent">4</span>
      </div>
      <h1 className="mb-2 text-lg font-semibold">{t("notFoundTitle")}</h1>
      <p className="mb-6 text-sm text-muted">{t("notFoundBody")}</p>
      <Link
        href={isLoggedIn ? "/dashboard" : "/login"}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
      >
        <ArrowLeft size={15} />
        {isLoggedIn ? t("backToDashboard") : t("backToLogin")}
      </Link>
    </StatusShell>
  );
}

export function ErrorContent({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <StatusShell>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-danger/10 text-danger">
        <span className="text-3xl">⚠</span>
      </div>
      <h1 className="mb-2 text-lg font-semibold">{t("errorTitle")}</h1>
      <p className="mb-6 text-sm text-muted">{t("errorBody")}</p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
        >
          <RotateCcw size={15} /> {t("tryAgain")}
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ring-border transition hover:bg-accent-tint"
        >
          {t("backToDashboard")}
        </button>
      </div>
    </StatusShell>
  );
}
