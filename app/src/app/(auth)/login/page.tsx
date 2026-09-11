import { Suspense } from "react";
import { LoginForm, LoginHeader } from "./login-form";
import { BrandLogo } from "@/components/brand-logo";
import { AppearancePanel } from "@/components/appearance-panel";

export const metadata = { title: "Login — Bela Nepal Industries" };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <AppearancePanel />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size={88} className="mb-3" />
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <LoginHeader />
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Demo: admin@bela.local / cashier@bela.local — password123
        </p>
      </div>
    </main>
  );
}
